<?php
namespace Model;

class InstantSearch_Config extends Module_Config {
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
		$classes = [
			'InstantSearch\\Base' => INCLUDE_PATH.'model'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR.'Base.php',
		];

		$files = glob(INCLUDE_PATH.'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR.'*');
		foreach($files as $f){
			$file = pathinfo($f);
			$classes['InstantSearch\\'.$file['filename']] = $f;
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
