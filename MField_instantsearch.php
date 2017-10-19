<?php
namespace Model;

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

		$attributes['data-instant-search'] = isset($attributes['name']) ? $attributes['name'] : $this->options['name'];
		unset($attributes['name']);

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

	function getJsValue($lang = null){
		return [
			'id' => $this->getValue($lang),
			'text' => $this->getText(['lang' => $lang]),
		];
	}

	function getText(array $options = []){
		$options = array_merge([
			'lang' => null,
		], $options);

		if(isset($this->options['instant-search-id']) and $this->options['instant-search-id']){
			$submodule_name = $this->options['instant-search-id'];
			if (file_exists(INCLUDE_PATH . 'data/config/InstantSearch/' . $submodule_name . '.php'))
				require_once(INCLUDE_PATH . 'data/config/InstantSearch/' . $submodule_name . '.php');
			else
				$submodule_name = 'Base';
		}else{
			$submodule_name = 'Base';
		}

		$submodule_name = '\\Model\\InstantSearch\\' . $submodule_name;

		$fieldOptions = $this->options;
		if($fieldOptions['text-field'])
			$fieldOptions['fields'] = $fieldOptions['text-field'];

		$submodule = new $submodule_name($this->model, $fieldOptions);
		return $submodule->getText($this->getValue($options['lang']));
	}
}
