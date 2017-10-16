<?php
namespace Model\InstantSearch;

use Model\Core;

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
			'pattern' => null,
			'where' => [],
			'limit' => 200,
		], $options);

		$this->init();
	}

	public function init(){}

	public function getText($r){
		if(!$this->options['table'])
			return '';

		if(!is_string($this->options['pattern'])){
			if(!$this->options['fields'])
				return '';
			$this->options['pattern'] = implode(' ', array_map(function($f){
				return '[:'.$f.']';
			}, $this->options['fields']));
		}

		if(is_numeric($r))
			$r = $this->model->_Db->select($this->options['table'], $r);

		if(!$r)
			return '';

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

	public function getList($query, $is_popup = false){
		if(!$this->options['table'] or !$this->options['fields'])
			return '';

		$where = $this->makeQuery($query, $this->options['fields']);
		if($this->options['where']){
			$where = array_merge($this->options['where'], $where);
		}

		$q = $this->model->_Db->select_all($this->options['table'], $where, ['limit' => $this->options['limit']]);
		$array = [];
		if($q){
			foreach($q as $s) {
				$arr = [
					'id' => $s['id'],
					'text' => $this->getText($s),
				];

				if($is_popup){
					$arr['fields'] = [];
					foreach($this->options['fields'] as $f){
						$arr['fields'][$f] = isset($s[$f]) ? $s[$f] : null;
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
