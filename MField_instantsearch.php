<?php namespace Model\InstantSearch;

use Model\Form\MField;

class MField_instantsearch extends MField {
	protected function renderWithLang(array $attributes, $lang = false){
		if(!$this->model->isLoaded('InstantSearch'))
			$this->model->load('InstantSearch');

		$is_options = [
			'instant-search-id',
			'table',
			'pattern',
			'fields',
			'table-fields',
			'where',
			'post',
			'post-function',
		];

		if(!isset($attributes['data-instant-search'])){
			$attributes['data-instant-search'] = isset($attributes['name']) ? $attributes['name'] : $this->options['name'];
			unset($attributes['name']);
		}

		foreach($is_options as $k){
			if(isset($this->options[$k]) and $this->options[$k])
				$attributes['data-'.$k] = is_array($this->options[$k]) ? implode(',', $this->options[$k]) : $this->options[$k];
		}

		if($this->options['text-field'] and !isset($attributes['data-fields']))
			$attributes['data-fields'] = is_array($this->options['text-field']) ? implode(',', $this->options['text-field']) : $this->options['text-field'];

		echo '<input type="text" value="'.entities($this->getValue($lang)).'" '.$this->implodeAttributes($attributes).' />';
	}

	public function getMinWidth(){
		return 180;
	}

	public function getJsValue($lang = null){
		return $this->getItem($lang);
	}

	private function getItem($lang = null){
		if(isset($this->options['instant-search-id']) and $this->options['instant-search-id']){
			$helper_name = $this->options['instant-search-id'];
			if (file_exists(INCLUDE_PATH . 'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR . $helper_name . '.php'))
				require_once(INCLUDE_PATH . 'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR . $helper_name . '.php');
			else
				$this->model->error('Instant Search error: provided helper name "'.$helper_name.'" does not seem to exist."');
		}else{
			$helper_name = 'Base';
		}

		$helper_name = '\\Model\\InstantSearch\\' . $helper_name;

		$fieldOptions = $this->options;
		if($fieldOptions['text-field'])
			$fieldOptions['fields'] = is_array($fieldOptions['text-field']) ? $fieldOptions['text-field'] : [$fieldOptions['text-field']];

		$helper = new $helper_name($this->model, $fieldOptions);
		return $helper->getItemFromId($this->getValue($lang));
	}

	public function getText(array $options = []){
		$options = array_merge([
			'lang' => null,
		], $options);

		$item = $this->getItem($options['lang']);
		return $item['text'];
	}
}
