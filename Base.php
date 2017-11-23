<?php namespace Model\InstantSearch;

use Model\Core\Core;

class Base{
	/** @var \Model\Core */
	protected $model;
	/** @var array */
	protected $options;

	public function __construct(Core $model, array $options = []){
		$this->model = $model;

		$this->options = array_merge([
			'table' => null,
			'fields' => null,
			'table-fields' => null,
			'pattern' => null,
			'where' => [],
			'limit' => 200,
		], $options);

		$this->init();
	}

	public function init(){}

	public function getText($r){
		if(!$r or !$this->options['table'])
			return '';

		if($this->options['pattern']===null){
			if(!$this->options['fields'])
				return '';

			$this->options['pattern'] = $this->makePattern($this->options['fields']);
		}

		$text = $this->options['pattern'];
		preg_match_all('/\[:([a-z0-9_-]+)\]/i', $this->options['pattern'], $matches);
		foreach($matches[1] as $f){
			if(isset($r[$f]))
				$value = $r[$f];
			else
				$value = '';

			$text = str_replace('[:'.$f.']', $value, $text);
		}

		return $text;
	}

	public function getTextFromId($id){
		$r = $this->model->_Db->select($this->options['table'], $id);
		if(!$r)
			return '';
		return $this->getText($r);
	}

	public function makePattern($fields){
		return implode(' ', array_map(function($f){
			return '[:'.$f.']';
		}, $fields));
	}

	public function getList($query, $is_popup = false){
		$fields = $this->options['fields'];
		if($is_popup and $this->options['table-fields'])
			$fields = $this->options['table-fields'];

		if(!$this->options['table'] or !$fields)
			return '';

		$where = $this->makeQuery($query, $fields);
		if($this->options['where']){
			$where = array_merge($this->options['where'], $where);
		}

		$q = $this->model->_Db->select_all($this->options['table'], $where, ['limit' => $this->options['limit'], 'raw' => true]);
		$array = [];
		if($q){
			foreach($q as $r) {
				$arr = [
					'id' => $r['id'],
					'text' => $this->getText($r),
				];

				if($is_popup){
					$arr['fields'] = [];
					foreach($fields as $f){
						$arr['fields'][$f] = isset($r[$f]) ? $r[$f] : null;
					}
				}

				$array[] = $arr;
			}
		}
		return $array;
	}

	protected function makeQuery($query, $fields){
		if(!is_array($fields))
			$fields = [$fields];

		$query = preg_replace('/  +/i', ' ', trim($query));
		$where = array(); $qq = explode(' ', $query);
		foreach($qq as $word)
			$this->addWord($where, $fields, $word);
		return $where;
	}

	private function addWord(array &$where, array $fields, $word){
		$arr = array();
		foreach($fields as $c){
			$arr[] = [$c, 'REGEXP', '(^|[^a-z0-9])'.$word];
		}
		$where[] = ['operator'=>'OR', 'sub'=>$arr];
	}
}
