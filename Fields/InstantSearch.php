<?php namespace Model\InstantSearch\Fields;

use Model\Core\Autoloader;
use Model\Form\Field;

class InstantSearch extends Field
{
	protected function renderWithLang(array $attributes, string $lang = null)
	{
		if (!$this->model->isLoaded('InstantSearch'))
			$this->model->load('InstantSearch');

		$textFieldAttributes = [
			'name',
			'class',
			'style',
			'data-instant-search',
		];

		$is_options = [
			'instant-search-id',
			'table',
			'pattern',
			'id-field',
			'fields',
			'table-fields',
			'where',
			'post',
			'post-function',
		];

		if (!isset($attributes['data-instant-search'])) {
			$attributes['data-instant-search'] = isset($attributes['name']) ? $attributes['name'] : $this->options['name'];
			unset($attributes['name']);
		}

		foreach ($is_options as $k) {
			if (isset($this->options[$k]) and $this->options[$k])
				$attributes['data-' . $k] = is_array($this->options[$k]) ? implode(',', $this->options[$k]) : $this->options[$k];
			$textFieldAttributes[] = 'data-' . $k;
		}

		if ($this->options['id-field'] and !isset($attributes['data-id-field']))
			$attributes['data-id-field'] = $this->options['id-field'];
		if ($this->options['text-field'] and !isset($attributes['data-fields']))
			$attributes['data-fields'] = is_array($this->options['text-field']) ? implode(',', $this->options['text-field']) : $this->options['text-field'];

		$item = $this->getItem($lang);

		if (!isset($attributes['only-text'])) {
			$hiddenFieldAttributes = [
				'data-instant-search' => $attributes['data-instant-search'],
			];

			foreach ($attributes as $k => $v) {
				if (!in_array($k, $textFieldAttributes)) {
					$hiddenFieldAttributes[$k] = $attributes[$k];
					unset($attributes[$k]);
				}
			}

			echo '<input type="hidden" data-instant-search-value="' . entities($item['id']) . '" ' . $this->implodeAttributes($hiddenFieldAttributes) . ' />';
		} else {
			if ($item['id'])
				$attributes['data-instant-search-value'] = $item['id'];
			unset($attributes['only-text']);
		}

		echo '<input type="text" ' . $this->implodeAttributes($attributes) . ' />';
	}

	public function getMinWidth(): int
	{
		return 180;
	}

	public function getJsValue($lang = null)
	{
		return $this->getItem($lang);
	}

	private function getItem($lang = null)
	{
		if (isset($this->options['instant-search-id']) and $this->options['instant-search-id']) {
			$helper_name = Autoloader::searchFile('Helper', $this->options['instant-search-id']);
			if (!$helper_name)
				$this->model->error('Instant Search error: provided helper name "' . $helper_name . '" does not seem to exist."');
		} else {
			$helper_name = '\\Model\\InstantSearch\\Base';
		}

		$fieldOptions = $this->options;
		if ($fieldOptions['text-field'])
			$fieldOptions['fields'] = is_array($fieldOptions['text-field']) ? $fieldOptions['text-field'] : [$fieldOptions['text-field']];

		$helper = new $helper_name($this->model, $fieldOptions);
		return $helper->getItemFromId($this->getValue($lang));
	}

	public function getText(array $options = []): string
	{
		$options = array_merge([
			'lang' => null,
		], $options);

		$item = $this->getItem($options['lang']);
		return $item['text'];
	}
}
