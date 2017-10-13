<?php
namespace Model;

class InstantSearch extends Module{
	/**
	 * Takes advantage of the Popup and ContextMenu modules, if present
	 *
	 * @param mixed $options
	 */
	function init($options){
		if($this->model->moduleExists('ContextMenu') and $this->model->moduleExists('Popup')){
			if(!$this->model->isLoaded('ContextMenu'))
				$this->model->load('ContextMenu');
			if(!$this->model->isLoaded('Popup'))
				$this->model->load('Popup');
		}
	}

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
