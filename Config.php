<?php namespace Model\InstantSearch;

use Model\Core\Module_Config;

class Config extends Module_Config {
	/**
	 * @param array $data
	 * @return bool
	 */
	public function install(array $data=[]){
		if(!is_dir(INCLUDE_PATH.'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'))
			mkdir(INCLUDE_PATH.'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch');
		return true;
	}

	/**
	 * Rule for searching
	 *
	 * @return array
	 */
	public function getRules(){
		return [
			'rules'=>[
				'instant-search'=>'instant-search',
			],
			'controllers'=>[
				'InstantSearch',
			],
		];
	}
}
