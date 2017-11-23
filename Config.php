<?php namespace Model\InstantSearch;

use Model\Core\Module_Config;

class Config extends Module_Config {
	/**
	 *
	 * @return bool
	 */
	public function makeCache(){
		if (!is_dir(INCLUDE_PATH . 'app' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'InstantSearch'))
			mkdir(INCLUDE_PATH . 'app' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'InstantSearch');

		return true;
	}

	/**
	 * Returns all submodules name, in order to be registered by the Core
	 *
	 * @return array
	 */
	public function getClasses(){
		$classes = [];

		$files = glob(INCLUDE_PATH.'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR.'*');
		foreach($files as $f){
			$file = pathinfo($f);
			$classes['Model\\InstantSearch\\'.$file['filename']] = $f;
		}

		return $classes;
	}

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
