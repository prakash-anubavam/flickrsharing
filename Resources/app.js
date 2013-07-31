Ti.include('js/titanium_oauth.js');
//var api_key = "080bbb85c01048b33b3bd76bdb936abc";
//var api_secret = "fd2a1cca85b821c6";
var api_key ="60ed9096cceb46863bc86ac218e771f8";
var api_secret = "41433179d35e6523";
var auth_token;


var win = Ti.UI.createWindow({
	backgroundColor : '#fff',
	fullscreen : false,
	exitOnClose : true
});

win.open();

var btnFlickr = Ti.UI.createButton({
	left : 10,
	top : 10,
	title : "flickr"
});

win.add(btnFlickr);
//oauth_callback
var oauth = new TitaniumOAuth(api_key,api_secret);
var options = {
            method: 'POST',
            action: 'http://up.flickr.com/services/upload/',
            parameters: [
               ['photo', win.toImage],
               ['title ','test upload']
           ]
        };
btnFlickr.addEventListener('click', function(e) {
	oauth.requestToken(function() {
	    oauth.request(options, function(data) {
	        Ti.API.info(" final data =="+data);
	    });
	});
});



