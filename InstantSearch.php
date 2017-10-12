<?php
namespace Model;

class InstantSearch extends Module{
	/**
	 * Controller for API actions
	 *
	 * @param array $request
	 * @param string $rule
	 * @return array
	 */
	public function getController(array $request, $rule){
		return [
			'controller'=>'InstantSearch',
		];
	}
}
