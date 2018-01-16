<?php namespace {namespace};

use Model\InstantSearch\Base;

class {name} extends Base
{
	public function getItem($r)
	{
		/*
		 * return [
		 * 		'id' => 23,
		 * 		'text' => 'element name',
		 * ];
		 * */
	}

	public function getItemFromId($id)
	{
		//$element = your code for loading the element / array / whatever
		return $this->getItem($element);
	}

	public function getList($query, $is_popup = false)
	{
		// return a numeric array, a list of elements, that will be passed to getItem
	}
}
