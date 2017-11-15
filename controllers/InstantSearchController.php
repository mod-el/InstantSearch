<?php
class InstantSearchController extends \Model\Controller {
	public function index(){
		try{
			if(!isset($_GET['v']) and !isset($_GET['text']) and !isset($_GET['popup']))
				$this->model->error('Wrong data.');

			if(isset($_GET['text']) or isset($_GET['v'])){
				if($this->model->getRequest(1)) {
					$submodule_name = $this->model->getRequest(1);
					if (file_exists(INCLUDE_PATH . 'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR . $submodule_name . '.php'))
						require_once(INCLUDE_PATH . 'app'.DIRECTORY_SEPARATOR.'config'.DIRECTORY_SEPARATOR.'InstantSearch'.DIRECTORY_SEPARATOR . $submodule_name . '.php');
					else
						$submodule_name = 'Base';
				}else{
					$submodule_name = 'Base';
				}

				$is_popup = isset($_GET['popup']) ? true : false;

				$submodule_name = '\\Model\\InstantSearch\\' . $submodule_name;

				$options = [];
				if(isset($_GET['table']))
					$options['table'] = $_GET['table'];
				if(isset($_GET['fields']))
					$options['fields'] = explode(',', $_GET['fields']);
				if(isset($_GET['table-fields']))
					$options['table-fields'] = explode(',', $_GET['table-fields']);
				if(isset($_GET['pattern']))
					$options['pattern'] = $_GET['pattern'];
				if(isset($_GET['limit']))
					$options['limit'] = $_GET['limit'];
				if(isset($_GET['where']))
					$options['where'] = json_decode($_GET['where'], true);

				$submodule = new $submodule_name($this->model, $options);

				if(isset($_GET['text'])){
					$array = $submodule->getList($_GET['text'], $is_popup);
					echo json_encode($array);
				}else if(isset($_GET['v'])){
					echo $submodule->getTextFromId($_GET['v']);
				}

				die();
			}elseif(isset($_GET['popup'])){
				$this->viewOptions['template-path'] = 'model/InstantSearch/templates';
				$this->viewOptions['cache'] = false;
				$this->viewOptions['showLayout'] = false;

				if(isset($_GET['table-fields']))
					$this->viewOptions['fields'] = explode(',', $_GET['table-fields']);
				elseif(isset($_GET['fields']))
					$this->viewOptions['fields'] = explode(',', $_GET['fields']);
				else
					$this->viewOptions['fields'] = ['instant-search-main'];
			}
		}catch(Exception $e){
			echo getErr($e);
			die();
		}
	}
}
