/* GUI INITIALIZATION */
egg.ready(function (){
	//side navi animation
	$$('.side_navi > a').fire(function(){
		$(this).refine('* img').toggle('mouseleave|mouseenter','opacity',1,{triggerObj:this,animate:150});
		$(this).refine('* .sliding_navi').toggle('mouseleave|mouseenter','left',-18,{triggerObj:this,animate:[200,['easeOut',4]]});
	}).click(function(){this.blur();},{simple:true});
});

/* HISTORY MANAGEMENT */
egg.bind('ajax.loading', function(){
	//this.innerHTML = "<div class='loading'>Loading...</div>";
});
egg.bind('ajax.historychange', function(oldurl, newurl){
	//urls follow this format: #!/page/phpFile/argName1/argVal1/argName2/argVal2...
	//which is parsed to: pages/page/run/phpFile.php?argName1=argVal1&argName2=argVal2...
	var ajaxurl = "pages/";
	//trim the slashes, then split into ['page','phpFile','argName1/argVal1...']
	newurl = newurl.replace(/^\/+|\/+$/g,"").match(/(.*?)(?:\/(.*?)(?:\/(.*)|$)|$)/);
	newurl.shift();
	//add 'page' and 'phpFile' to the ajaxurl
	ajaxurl += egg.isset(newurl[0]) && newurl[0] != '' ? newurl[0] : 'cp';
	ajaxurl += egg.isset(newurl[1]) && newurl[0] != '' ? '/run/'+newurl[1]+'.php' : '/index.php';
	//add arguments to the ajax url
	var urlargs = {};
	if (egg.isset(newurl[2])){
		//split the args by the slash
		newurl[2] = newurl[2].split('/');
		//there needs to be an even number of args (argName=argVal)
		if (newurl[2].length/2 - parseInt(newurl[2].length/2) != 0) newurl[2].pop();
		//store the num of args for ajax_update_context referencing
		var numArgs = newurl[2].length/2;
		//add the args to the ajaxurl
		for (var arg=0; arg<newurl[2].length; arg=arg+2)
			urlargs[newurl[2][arg]] = newurl[2][arg+1];
	}
	//If this is the first page load, we need to tell the php script to load the entire thing
	var fullPage = oldurl == '';
	//If we newurl[2] was set, we can load a custom context for this ajax request (as long as this isn't the first page load)
	if (!fullPage && egg.isset(ajaxUpdateContext[newurl[0]]) && egg.isset(numArgs)){
		var context = $(ajaxUpdateContext[newurl[0]][numArgs]);
		//If we couldn't find the update element, just load the full page
		if (context.getContext() == false) fullPage = true;
	} else fullPage = true;
	//Load the full page
	if (fullPage){
		urlargs['loadFullPage'] = true;
		context = $('#content');
	}
	//Load the url
	context.ajax(ajaxurl, {html:true, params:urlargs, oncomplete:function(text){
		//run onload triggers
		var onfinish = navi_callback[newurl[0]];
		if (egg.isFn(onfinish)) onfinish.apply(this, [urlargs, newurl[1]]);
		$$('#content *').inputClearFX('#583f2d');
	}});
});
//This tells where to update on the page, given an ajax history url
var ajaxUpdateContext = {
	//'PAGE':['EL1','EL2','EL3']
}
//Callback functions after AJAX page load
var navi_callback = {
	//'PAGE': function(args, phpFile){},
}

/* LOGIN CALLBACKS */
relative_root_path = "../";
function loggedin_display(){
	$('#login_logout').text("<a href='#!/cp'>Control Panel</a> | <a href='javascript:logout()'>Logout</a>");
	//egg.history("/cp",true);
}
function loggedout_display(){
	$('#login_logout').text("<a href='#!/cp/login_format'>Login</a>");
	//egg.history("/cp",true);
}

/* PAGE SCRIPTS */
function submit_report(){
	//For submitting a bug report
	var complete = $$('#bug_report *').inputClearFX().isset();
	if (!complete) $('.form_feedback').text("Please complete the form first.").active().style.display = 'inline';
	else{
		var form = egg.lookup('#bug_report')[0];
		//Submit the form
		$('.page_padding').ajax('pages/report/send_report.php',{type:'post',params:{
			'browser':window.navigator.userAgent,
			'email':form.email.value,
			'message':form.description.value
		},oncomplete:function(response){
			if (response != '') $('.form_feedback').text(response).active().style.display = 'inline';
			else this.innerHTML = "<strong>Thanks for your help!</strong>";
		}});
	}
}

//POPUP BOX
function delete_site(confirm){
	//Show the confirmation message
	if (confirm != true){
		message("\
			<div class='confirm_delete'>\
				<h2>Are you sure?</h2>\
				This will delete all of this site's project files.<p/>\
				<input type='button' class='btn_type' value='Yes' onclick='delete_site(true)'/> <input type='button' class='btn_type' value='No' onclick='message()'/>\
			</div>\
		");
	}
	//Delete the site
	else{
		message();
	}
}
function unavailable(){
	message("<div class='confirm_delete' style='font-size:18px;'>Feature is unavailable.<br/>Check back later</div>");
}
function message(html){
	if (egg.isset(html)){
		//Get the size of the new box
		var newMess = $(document.body).zen(true,"div.mess_contents[style='position:absolute']").text(html);
		var size = [
			parseInt(newMess.getStyle('width'))+20,
			parseInt(newMess.getStyle('height'))+20
		];
		newMess.remove();
		//Center the box and add the contents
		$('#popupbox_cont').style({
			'left':(window.innerWidth-size[0])/2+"px",
			'top':(window.innerHeight-size[1])/2+"px",
			'width':size[0]+"px",
			'height':size[1]+"px"
		});
		$('.mess_contents').text(html);
		var show = function(){$(this).style("display","block");}
		$('#popupbox_cont').animate('opacity',1,300,{onstart:show});
		$('#popupbox_opacity').animate('opacity',.75,300,{onstart:show});
	}
	else $$('#popupbox_opacity,#popupbox_cont').animate('opacity',0,300,{oncomplete:function(){this.style.display = "none";}});
}