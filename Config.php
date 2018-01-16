<?php namespace Model\InstantSearch;

use Model\Core\Module_Config;

class Config extends Module_Config {
	/**
	 * Rule for searching
	 *
	 * @return array
	 */
	public function getRules(): array
	{
		return [
			'rules' => [
				'instant-search' => 'instant-search',
			],
			'controllers' => [
				'InstantSearch',
			],
		];
	}
}
