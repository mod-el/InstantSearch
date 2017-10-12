<?php
class InstantSearchController extends \Model\Controller {
	public function index(){
		try{
			if(!isset($_GET['v']) and !isset($_GET['text']))
				$this->model->error('Wrong data.');

			if($this->model->getRequest(1)) {
				$submodule_name = $this->model->getRequest(1);
				if (file_exists(INCLUDE_PATH . 'data/config/InstantSearch/' . $submodule_name . '.php'))
					require_once(INCLUDE_PATH . 'data/config/InstantSearch/' . $submodule_name . '.php');
				else
					$submodule_name = 'Base';
			}else{
				$submodule_name = 'Base';
			}

			$submodule_name = '\\Model\\InstantSearch\\' . $submodule_name;

			$options = [];
			if(isset($_GET['table']))
				$options['table'] = $_GET['table'];
			if(isset($_GET['fields']))
				$options['fields'] = explode(',', $_GET['fields']);
			if(isset($_GET['pattern']))
				$options['pattern'] = $_GET['pattern'];
			if(isset($_GET['limit']))
				$options['limit'] = $_GET['limit'];
			if(isset($_GET['where']))
				$options['where'] = json_decode($_GET['where'], true);

			$submodule = new $submodule_name($this->model, $options);

			if(isset($_GET['text'])){
				$array = $submodule->getList($_GET['text']);
				echo json_encode($array);
			}else if(isset($_GET['v'])){
				echo $submodule->getText($_GET['v']);
			}
		}catch(Exception $e){
			echo getErr($e);
			die();
		}

		die();
	}
}
