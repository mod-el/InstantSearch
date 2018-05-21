<?php namespace Model\InstantSearch;

use Model\Core\Core;

class Base
{
	/** @var \Model\Core\Core */
	protected $model;
	/** @var array */
	protected $options;

	public function __construct(Core $model, array $options = [])
	{
		$this->model = $model;

		$this->options = array_merge([
			'table' => null,
			'fields' => null,
			'id-field' => 'id',
			'table-fields' => null,
			'pattern' => null,
			'where' => [],
			'limit' => 200,
			'fill' => null,
		], $options);

		$this->init();
	}

	public function init()
	{
	}

	public function getItem($r): array
	{
		if (!$r) {
			return [
				'id' => null,
				'text' => '',
			];
		}

		$default = [
			'id' => $r[$this->options['id-field']] ?? null,
			'text' => '',
		];

		if (!$this->options['table'])
			return $default;

		if ($this->options['pattern'] === null) {
			if (!$this->options['fields'])
				return $default;

			$this->options['pattern'] = $this->makePattern($this->getTotalFields());
		}

		$text = $this->options['pattern'];
		preg_match_all('/\[:([a-z0-9_-]+)\]/i', $this->options['pattern'], $matches);
		foreach ($matches[1] as $f) {
			if (isset($r[$f]))
				$value = $r[$f];
			else
				$value = '';

			$text = str_replace('[:' . $f . ']', $value, $text);
		}

		$item = [
			'id' => $r[$this->options['id-field']],
			'text' => $text,
		];

		if ($this->options['fill']) {
			$item['fill'] = [];
			foreach ($this->options['fill'] as $f => $fields_keys) {
				$item['fill'][$f] = [];
				foreach ($fields_keys as $k)
					$item['fill'][$f][] = $r[$k] ?? '';
				$item['fill'][$f] = implode(' ', array_filter($item['fill'][$f]));
			}
		}

		return $item;
	}

	public function getItemFromId($id): array
	{
		$r = $id ? $this->model->_Db->select($this->options['table'], $id) : false;
		if (!$r) {
			return [
				'id' => null,
				'text' => '',
			];
		}
		return $this->getItem($r);
	}

	public function makePattern(array $fields): string
	{
		return implode(' ', array_map(function ($f) {
			return '[:' . $f . ']';
		}, $fields));
	}

	public function getList(string $query, bool $is_popup = false): array
	{
		$fields = $this->options['fields'];
		if ($is_popup and $this->options['table-fields'])
			$fields = $this->options['table-fields'];

		if (!$this->options['table'] or !$fields)
			return [];

		$where = $this->makeQuery($query, $fields);
		if ($this->options['where'])
			$where = array_merge($this->options['where'], $where);

		$qryOptions = [
			'limit' => $this->options['limit'],
			'stream' => false,
			'fields' => $this->getTotalFields(true),
		];

		return $this->model->_Db->select_all($this->options['table'], $where, $qryOptions);
	}

	public function getItemsList(string $query, bool $is_popup = false): array
	{
		$q = $this->getList($query, $is_popup);
		if (!$q)
			return [];

		$list = [];

		if ($is_popup)
			$fields = $this->options['table-fields'] ?: $this->options['fields'];

		$c = 0;
		foreach ($q as $r) {
			$item = $this->getItem($r);

			if ($is_popup) {
				$arr['fields'] = [];
				foreach ($fields as $f) {
					$item['fields'][$f] = isset($r[$f]) ? $r[$f] : null;
				}
			}

			$list[] = $item;

			$c++;
			if ($c >= $this->options['limit'])
				break;
		}

		return $list;
	}

	protected function makeQuery(string $query, $fields): array
	{
		if (!is_array($fields))
			$fields = [$fields];

		$query = preg_replace('/  +/i', ' ', trim($query));
		$where = [];
		$qq = explode(' ', $query);
		foreach ($qq as $word)
			$this->addWord($where, $fields, $word);
		return $where;
	}

	private function addWord(array &$where, array $fields, string $word)
	{
		$arr = array();
		foreach ($fields as $c) {
			$arr[] = [$c, 'REGEXP', '(^|[^a-z0-9])' . $word];
		}
		$where[] = ['operator' => 'OR', 'sub' => $arr];
	}

	private function getTotalFields(bool $includeId = false): array
	{
		$totalFields = array_merge($this->options['fields'] ?: [], $this->getFieldsFromFillOption());
		if ($includeId)
			$totalFields[] = $this->options['id-field'];
		return array_unique($totalFields);
	}

	private function getFieldsFromFillOption(): array
	{
		$totalFields = [];
		if ($this->options['fill']) {
			foreach ($this->options['fill'] as $fields)
				$totalFields = array_merge($totalFields, $fields);
		}
		return array_unique($totalFields);
	}
}
