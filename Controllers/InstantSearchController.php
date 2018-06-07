<?php namespace Model\InstantSearch\Controllers;

use Model\Core\Controller;
use Model\Core\Autoloader;

class InstantSearchController extends Controller
{
	public function index()
	{
		try {
			if (!isset($_GET['v']) and !isset($_GET['text']) and !isset($_GET['popup']))
				$this->model->error('Wrong data.');

			if (isset($_GET['text']) or isset($_GET['v'])) {
				if ($this->model->getRequest(1)) {
					$helper_name = Autoloader::searchFile('Helper', $this->model->getRequest(1));
					if (!$helper_name)
						$helper_name = '\\Model\\InstantSearch\\Base';
				} else {
					$helper_name = '\\Model\\InstantSearch\\Base';
				}

				$is_popup = isset($_GET['popup']) ? true : false;

				$options = [];
				if (isset($_GET['table']))
					$options['table'] = $_GET['table'];
				if (isset($_GET['fields']))
					$options['fields'] = explode(',', $_GET['fields']);
				if (isset($_GET['id-field']))
					$options['id-field'] = $_GET['id-field'];
				if (isset($_GET['table-fields']))
					$options['table-fields'] = explode(',', $_GET['table-fields']);
				if (isset($_GET['pattern']))
					$options['pattern'] = $_GET['pattern'];
				if (isset($_GET['limit']))
					$options['limit'] = $_GET['limit'];
				if (isset($_GET['where']))
					$options['where'] = json_decode($_GET['where'], true);
				if (isset($_GET['wrap']))
					$options['wrap'] = $_GET['wrap'];
				if (isset($_GET['fill']))
					$options['fill'] = json_decode($_GET['fill'], true);

				$helper = new $helper_name($this->model, $options);

				if (isset($_GET['text'])) {
					$array = array_map(function ($row) use ($options) {
						return $this->wrapFill($row, $options['wrap'] ?? null);
					}, $helper->getItemsList($_GET['text'], $is_popup));
					echo json_encode($array);
				} else if (isset($_GET['v'])) {
					echo json_encode($this->wrapFill($helper->getItemFromId($_GET['v'] ?: null), $options['wrap'] ?? null));
				}

				die();
			} elseif (isset($_GET['popup'])) {
				$this->viewOptions['template-path'] = 'model/InstantSearch/templates';
				$this->viewOptions['cache'] = false;
				$this->viewOptions['showLayout'] = false;

				if (isset($_GET['table-fields']))
					$this->viewOptions['fields'] = explode(',', $_GET['table-fields']);
				elseif (isset($_GET['fields']))
					$this->viewOptions['fields'] = explode(',', $_GET['fields']);
				else
					$this->viewOptions['fields'] = ['instant-search-main'];
			}
		} catch (\Exception $e) {
			echo getErr($e);
			die();
		}
	}

	private function wrapFill($row, string $wrap = null)
	{
		if (!is_array($row) or !isset($row['fill']) or !$wrap)
			return $row;

		$newFill = [];
		foreach ($row['fill'] as $k => $v) {
			$k = str_replace('[name]', $k, $wrap);
			$newFill[$k] = $v;
		}
		$row['fill'] = $newFill;

		return $row;
	}
}
