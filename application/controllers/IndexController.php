<?php

class IndexController extends Zend_Controller_Action
{

    public function init()
    {
        $this->_helper->layout()->setLayout('home');
		$this->view->headTitle('Eggplant IDE | Nyrix, LLC');
    }

    public function indexAction()
    {
        // action body
    }


}

