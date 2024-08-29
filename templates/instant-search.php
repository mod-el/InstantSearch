<div class="instant-search-input-box">
	<input type="hidden" id="instant-search-url" value="<?= entities($this->model->prefix() . implode('/', $this->model->getRequest())) ?>"/>
	<input type="hidden" id="instant-search-get" value="<?= entities(http_build_query($_GET)) ?>"/>
	<input type="hidden" id="instant-search-post" value="<?= entities(http_build_query($_POST)) ?>"/>
	<input type="text" id="instant-search-value" onkeyup="instantSearchPopup()"/>
</div>

<table id="instant-search-table" cellspacing="0">
	<tr>
		<?php
		foreach ($fields as $f) {
			$label = $f;
			if ($f === 'instant-search-main')
				$label = 'Risultati';
			?>
			<td data-field="<?= entities($f) ?>">
				<?= entities(ucwords(strtolower($label))) ?>
			</td>
			<?php
		}
		?>
	</tr>
</table>

<div id="instant-search-cont-loading"></div>
