<?php namespace Model\InstantSearch\Fields;

use Model\Form\MField;

class InstantSearch extends MField {
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

		if(!isset($attributes['only-text'])){
			$attributes_hidden = [
				'data-instant-search' => $attributes['data-instant-search'],
			];
			if(isset($attributes['onchange'])){
				$attributes_hidden['onchange'] = $attributes['onchange'];
				unset($attributes['onchange']);
			}

			$item = $this->getItem($lang);
			$text_name = isset($attributes['name']) ? $attributes['name'] : $attributes['data-instant-search'];
			if(isset($item['fill'][$text_name]))
				$text = $item['fill'][$text_name];
			else
				$text = $item['text'];

			echo '<input type="hidden" value="'.entities($item['id']).'" '.$this->implodeAttributes($attributes_hidden).' />';
		}else{
			unset($attributes['only-text']);
		}

		echo '<input type="text" value="'.entities($text).'" '.$this->implodeAttributes($attributes).' />';
	}

	public function getMinWidth(){
		return 180;
	}

	public function getJsValue($lang = null){
		return $this->getItem($lang);
	}

	private function getItem($lang = null){
		if(isset($this->options['instant-search-id']) and $this->options['instant-search-id']){
			$helper_name = Autoloader::searchFile('Helper', $this->options['instant-search-id']);
			if (!$helper_name)
				$this->model->error('Instant Search error: provided helper name "'.$helper_name.'" does not seem to exist."');
		}else{
			$helper_name = '\\Model\\InstantSearch\\Base';
		}

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
