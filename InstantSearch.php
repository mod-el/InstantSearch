<?php namespace Model\InstantSearch;

use Model\Core\Module;

class InstantSearch extends Module
{
	/**
	 * Takes advantage of the Popup and ContextMenu modules, if present
	 *
	 * @param mixed $options
	 */
	function init(array $options)
	{
		if ($this->model->moduleExists('ContextMenu') and $this->model->moduleExists('Popup')) {
			if (!$this->model->isLoaded('ContextMenu'))
				$this->model->load('ContextMenu');
			if (!$this->model->isLoaded('Popup'))
				$this->model->load('Popup');
		}
	}

	/**
	 * Returns a security token, mandatory to send when not using a helper
	 *
	 * @param string $table
	 * @return string
	 */
	public function getToken(string $table): string
	{
		$token = $this->model->_RandToken->getToken('Form');
		return sha1($table . $token);
	}
}
