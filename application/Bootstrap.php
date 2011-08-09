<?php

class Bootstrap extends Zend_Application_Bootstrap_Bootstrap
{

	public function _initPlacehodlers()
	{
		$this->bootstrap('view');
		$view = $this->getResource('view');

		$view->headTitle('Eggplant IDE | Nyrix, LLC');
		$view->headMeta()->prependHttpEquiv('Content-Type', 'text/html;charset=utf-8');
		$view->headLink()->prependStylesheet('/styles/default.css');
		$view->headScript()->prependFile('/plugins/egg.js');
		$view->headScript()->appendFile('/scripts/scripts.js');
	}

}

