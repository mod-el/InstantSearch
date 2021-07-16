<?php namespace {namespace};

use Model\InstantSearch\Base;

class {name} extends Base
{
	public function getItem($el): array
	{
		/*
		 * return [
		 * 		'id' => 23,
		 * 		'text' => 'element name',
		 * ];
		 * */
	}

	public function getItemFromId($id): array
	{
		//$element = your code for loading the element / array / whatever
		return $this->getItem($element);
	}

	public function getList(string $query, bool $is_popup = false): iterable
	{
		// return a numeric array, a list of elements, that will be passed to getItem
	}
}
