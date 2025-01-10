<?php namespace Model\InstantSearch\Fields;

use Model\Core\Autoloader;
use Model\Form\Field;

class InstantSearch extends Field
{
	public function __construct(string $name, array $options = [])
	{
		parent::__construct($name, $options);

		if (!empty($this->options['instant-search-id'])) {
			$this->options['helper'] = $this->options['instant-search-id'];
			unset($this->options['instant-search-id']);
		}

		if (isset($this->options['visualizer']) and is_string($this->options['visualizer'])) {
			$this->options['visualizer'] = [
				'page' => $this->options['visualizer'],
				'visualizer' => 'Table',
			];
		}
	}

	protected function renderWithLang(array $attributes, ?string $lang = null): void
	{
		if (!$this->model->isLoaded('InstantSearch'))
			$this->model->load('InstantSearch');

		$textFieldAttributes = [
			'name',
			'class',
			'style',
			'placeholder',
			'data-instant-search',
			'text-name',
		];

		$is_options = [
			'helper',
			'table',
			'pattern',
			'id-field',
			'separator',
			'fields',
			'table-fields',
			'where',
			'joins',
			'post',
			'post-function',
			'visualizer',
		];

		if (!isset($attributes['data-instant-search'])) {
			$attributes['data-instant-search'] = $attributes['name'] ?? $this->options['name'];
			unset($attributes['name']);
		}

		foreach ($is_options as $k) {
			if (isset($this->options[$k]) and $this->options[$k]) {
				if (is_array($this->options[$k]))
					$attributes['data-' . $k] = in_array($k, ['where', 'joins', 'visualizer']) ? json_encode($this->options[$k]) : implode(',', $this->options[$k]);
				else
					$attributes['data-' . $k] = $this->options[$k];
			}
			$textFieldAttributes[] = 'data-' . $k;
		}

		if ($this->options['id-field'] and !isset($attributes['data-id-field']))
			$attributes['data-id-field'] = $this->options['id-field'];
		if ($this->options['text-field'] and !isset($attributes['data-fields']))
			$attributes['data-fields'] = is_array($this->options['text-field']) ? implode(',', $this->options['text-field']) : $this->options['text-field'];

		$item = $this->getItem($lang);

		$attributes = $this->makeDependingFieldsAttributes($attributes);

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
			if (isset($attributes['text-name'])) {
				$attributes['name'] = $this->wrapName($attributes['text-name']);
				unset($attributes['text-name']);
			}
		} else {
			if ($item['id'])
				$attributes['data-instant-search-value'] = $item['id'];
			unset($attributes['only-text']);
		}

		if (isset($attributes['data-helper']) and $this->form and $this->form->options['wrap-names'])
			$attributes['data-wrap'] = $this->form->options['wrap-names'];

		if (isset($attributes['data-table']))
			$attributes['data-token'] = $this->model->_InstantSearch->getToken($attributes['data-table']);

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
		if (!empty($this->options['helper'])) {
			$helper_name = Autoloader::searchFile('Helper', $this->options['helper']);
			if (!$helper_name)
				$this->model->error('Instant Search error: provided helper name "' . $this->options['helper'] . '" does not seem to exist."');
		} else {
			$helper_name = '\\Model\\InstantSearch\\Base';
		}

		$fieldOptions = $this->options;
		if ($fieldOptions['text-field'])
			$fieldOptions['fields'] = is_array($fieldOptions['text-field']) ? $fieldOptions['text-field'] : [$fieldOptions['text-field']];

		if (!($fieldOptions['token'] ?? false) and isset($fieldOptions['table']))
			$fieldOptions['token'] = $this->model->_InstantSearch->getToken($fieldOptions['table']);
		if ($this->form and $this->form->options['wrap-names'])
			$fieldOptions['wrap'] = $this->form->options['wrap-names'];

		$helper = new $helper_name($this->model, $fieldOptions);
		return $helper->wrapFill($helper->getItemFromId($this->getValue($lang)));
	}

	public function getText(array $options = []): string
	{
		$options = array_merge([
			'lang' => null,
		], $options);

		$item = $this->getItem($options['lang']);
		return $item['text'];
	}

	public function getJavascriptDescription(): array
	{
		$response = parent::getJavascriptDescription();

		$is_options = [
			'helper',
			'table',
			'pattern',
			'id-field',
			'separator',
			'fields',
			'table-fields',
			'where',
			'joins',
			'post',
			'post-function',
			'visualizer',
		];

		foreach ($is_options as $k) {
			if (isset($this->options[$k]) and $this->options[$k]) {
				if (is_array($this->options[$k]))
					$response['attributes']['data-' . $k] = in_array($k, ['where', 'joins', 'visualizer']) ? json_encode($this->options[$k]) : implode(',', $this->options[$k]);
				else
					$response['attributes']['data-' . $k] = $this->options[$k];
			}
		}

		if ($this->options['text-field'] and !isset($response['attributes']['data-fields']))
			$response['attributes']['data-fields'] = is_array($this->options['text-field']) ? implode(',', $this->options['text-field']) : $this->options['text-field'];

		if (isset($response['attributes']['data-table']))
			$response['attributes']['data-token'] = $this->model->_InstantSearch->getToken($response['attributes']['data-table']);

		return $response;
	}
}
