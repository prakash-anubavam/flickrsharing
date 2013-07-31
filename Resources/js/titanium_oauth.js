/*
* Titanium OAuth Client
*
* Copyright 2010, Social Vitamin, Inc.
* Licensed under the MIT
* Copyright (c) 2010 Social Vitamin, Inc.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

Ti.include('sha1.js');
Ti.include('oauth.js');

var TitaniumOAuth = function(ck, cs) {

	var self = this;
	var currentWin = Ti.UI.currentWindow;
	var authWebView = null;
	var oauthWin = null;
	var callback1 = null;

	var consumer = {
	    consumerKey:      ck,
	    consumerSecret:   cs,
	    serviceProvider: {
	        signatureMethod:     'HMAC-SHA1',
	        requestTokenURL:     'http://www.flickr.com/services/oauth/request_token',
	        userAuthorizationURL:'http://www.flickr.com/services/oauth/authorize',
	        accessTokenURL:      'http://www.flickr.com/services/oauth/access_token',
			oauthVersion:        '1.0'
	    }
	};
	
	var accessor = {
	    consumerSecret: consumer.consumerSecret,
	    tokenSecret: ''
	};

	this.loggedIn = function() {
		Ti.API.info("loggedIn Called");
		return  (Ti.App.Properties.getString('accessToken') == null && Ti.App.Properties.getString('accessTokenSecret') == null) ? false : true;
	};
	
	// Get Authorization PIN
	var getPIN = function(e)
	{
		//Ti.API.info("getPIN Called");
		Ti.API.info("get PIN url ="+authWebView.url);
		var html = authWebView.evalJS("document.getElementById('oauth_verifier').innerHTML");
		Ti.API.info("getPIN html =="+html);
		if (html != '') {
			var regex = new RegExp("([0-9]+)", "m"); 
			if (regex) {
				var pin = html.match(regex)[0]; 
				Ti.API.info("PIN == "+pin);
				if (pin) {
					self.accessToken(pin);
					if(oauthWin != null) {
						oauthWin.close();
					}				
				}
			}
		}
	};
	
	// Request Token
	this.requestToken = function(callback){
		
		if (Ti.App.Properties.getString('accessToken') != null &&
		Ti.App.Properties.getString('accessTokenSecret') != null) {
			Ti.API.info("requestToken accessTocken  secret not null ==");
			// Login
			self.dispatch('login');

			callback();

			return;

		}
		Ti.API.info("requestToken Called  null");
		var message = {
		    method: 'GET',
		    action: consumer.serviceProvider.requestTokenURL,
		    parameters: [
		       ['oauth_signature_method', consumer.serviceProvider.signatureMethod],
		       ['oauth_consumer_key', consumer.consumerKey],
		       ['oauth_version', consumer.serviceProvider.oauthVersion],
		       ['oauth_callback', null]
		   ]
		};
		
		OAuth.setTimestampAndNonce(message);
		OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
		OAuth.SignatureMethod.sign(message, accessor);
		
		var finalUrl = OAuth.addToURL(message.action, message.parameters);

		var xhr = Titanium.Network.createHTTPClient();
		xhr.onload = function()
		{
			
			Ti.API.info('requestToken responseText = '+this.responseText);
			if (!this.responseText.match(/oauth_token=([^&]+)&/)){
				self.logout();
			}
			
			// Set Tokens
			Ti.App.Properties.setString('oauthToken', this.responseText.match(/oauth_token=([^&]+)/)[1]);
			Ti.App.Properties.setString('oauthTokenSecret', this.responseText.match(/oauth_token_secret=([^&]+)/)[1]);
			
			// Access Token Secret
			accessor.tokenSecret = Ti.App.Properties.getString('accessTokenSecret');
			Ti.API.info('requestToken oauthToken = '+Ti.App.Properties.getString('oauthToken'));
			Ti.API.info('requestToken oauthTokenSecret = '+Ti.App.Properties.getString('oauthTokenSecret'));
			
			// Verify if we have an access token if we dont show auth webview
			if (Ti.App.Properties.getString('accessToken') == null && 
					Ti.App.Properties.getString('accessTokenSecret') == null) {
				Ti.API.info('accessTokenSecret is null');
				self.oauthWebView({
					url: consumer.serviceProvider.userAuthorizationURL + '?' + this.responseText
				});
			} else {
				callback();
			}
			
		};
		xhr.onerror = function(e) {
			Ti.API.info("error ==> "+JSON.stringify(e));
			Ti.UI.createAlertDialog({
                title: 'Service Unavailable',
                message: 'Service unavailable please try again later.'
            }).show();
			
			// Logout
			self.logout();
		};
		xhr.open('GET', finalUrl);
		xhr.send();
	
	};
	
	// Access Token
	this.accessToken = function(pin, callback){
		Ti.API.info("accessToken Called");
	    var message = {
	        method: 'GET',
	        action: consumer.serviceProvider.accessTokenURL,
		   parameters: [
	           ['oauth_signature_method', consumer.serviceProvider.signatureMethod],
	           ['oauth_consumer_key', consumer.consumerKey],
	           ['oauth_version', consumer.serviceProvider.oauthVersion],
	           ['oauth_token', Ti.App.Properties.getString('oauthToken')],
	           ['oauth_verifier', pin]
	       ]
	    };

	    OAuth.setTimestampAndNonce(message);
	    OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
	    OAuth.SignatureMethod.sign(message, accessor);
		
	    var finalUrl = OAuth.addToURL(message.action, message.parameters);

		var xhr = Titanium.Network.createHTTPClient();
		xhr.onload = function()
		{
			Ti.API.info(' accessToken responseText = '+this.responseText);
			if (!this.responseText.match(/oauth_token=([^&]+)&/)){
				self.logout();
			}
			
			Ti.App.Properties.setString('accessToken', this.responseText.match(/oauth_token=([^&]+)&/)[1]);
			Ti.App.Properties.setString('accessTokenSecret', this.responseText.match(/oauth_token_secret=([^&]+)&/)[1]);	

			// Login
			self.dispatch('login');
		};
		xhr.onerror = function(e) {
			Ti.API.info("error ==> "+JSON.stringify(e));
			Ti.UI.createAlertDialog({
                title: 'Service Unavailable',
                message: 'Service unavailable please try again later.'
            }).show();
			
			// Logout
			self.logout();
		};
		xhr.open('GET', finalUrl);
		xhr.send();

	};
	
	// Show Authorization Web View
	this.oauthWebView = function(params)
	{
		Ti.API.info("oauthWebView Called");
		var t = Titanium.UI.create2DMatrix().scale(0);
		
		var win = Ti.UI.createWindow({
			backgroundColor:'#CCE6F0',
			borderWidth:4,
			borderColor:'#52D3FE',
			height:"350dp",
			width:"275dp",
			borderRadius:10,
			transform:t
        });

		// WebView
	    authWebView = Ti.UI.createWebView({
				url: params.url
			});
		
		authWebView.addEventListener('load', getPIN);
	    win.add(authWebView);
		
		// Remove window button
		var cl = Ti.UI.createLabel({
			width: 24,
			height: 24,
			right: 10, 
			top: 10,
			borderRadius: 6,
			borderColor: '#52D3FE',
			backgroundColor: '#52D3FE',
			text: 'X',
			textAlign: 'center',
			font:{fontSize:11, fontWeight: 'bold'},
			color:'#fff'
		});
		
		cl.addEventListener('click', function(e){
			var a = Titanium.UI.createAnimation({opacity: 0, duration: 300});
			win.animate(a, function(){
				win.close();
			});
		});
		
		win.add(cl);
		
		win.open();
		
		// Window Animation
		var t1 = Ti.UI.create2DMatrix().scale(0);
		var t2 = Ti.UI.create2DMatrix().scale(1.1);
		var t3 = Ti.UI.create2DMatrix().scale(1.0);
		
		var a = Titanium.UI.createAnimation({transform: t1, duration: 300});
		var a2 = Titanium.UI.createAnimation({transform: t2, duration: 350});
		var a3 = Titanium.UI.createAnimation({transform: t3, duration: 400});
		
		win.animate(a);
		
		a.addEventListener('complete', function()
		{
			win.animate(a2);
		});
		
		a2.addEventListener('complete', function()
		{
			win.animate(a3);
		});
		
		// Set the window so we can remove it in the callback
		oauthWin = win;
	
	};
	
	// Request
	this.request = function(options, callback) {
		 Ti.API.info("request Called 1");
        var message = {
			method: options.method,
			action: options.action,
			parameters: [
			['oauth_signature_method', consumer.serviceProvider.signatureMethod],
			['oauth_consumer_key', consumer.consumerKey],
			['oauth_version', consumer.serviceProvider.oauthVersion],
			['oauth_token', Ti.App.Properties.getString('accessToken')]
			]
		};
        Ti.API.info("request Called 2");
		for (param in options.parameters) {
			message.parameters.push(options.parameters[param]);
		};
		 Ti.API.info("request Called 3");
		// Access Token Secret
		accessor.tokenSecret = Ti.App.Properties.getString('accessTokenSecret');
		 Ti.API.info("request Called 4");
		OAuth.setTimestampAndNonce(message);
		OAuth.SignatureMethod.sign(message, accessor);
		 Ti.API.info("request Called 5");
		var finalUrl = OAuth.addToURL(message.action, message.parameters);
		 Ti.API.info("request Called 6");
		var xhr = Titanium.Network.createHTTPClient({
			timeout: 200000
		});
		xhr.onload = function() {
			Ti.API.info('request responseText = '+this.responseText);
			callback(this.responseText);
		};
		xhr.onerror = function(e) {
			Ti.API.info("request error ==> "+JSON.stringify(e));
			Ti.UI.createAlertDialog({
				title: 'Service Unavailable',
				message: 'An error ocurred while making a request.'
			}).show();

			// Logout
			self.dispatch('logout');
		};
		xhr.open(options.method, finalUrl, false);
		 Ti.API.info("request Called 7");
		xhr.send();
		 Ti.API.info("request Called 8");
		
	};
	
	this.logout = function() {
		Ti.App.Properties.setString('oauthToken', null);
	    Ti.App.Properties.setString('oauthTokenSecret', null);
		Ti.App.Properties.setString('accessToken', null);
	    Ti.App.Properties.setString('accessTokenSecret', null);

		// Logout
		self.dispatch('logout');
	};

};

// Dispatcher
function Dispatcher() {
	this.events = [];
};

Dispatcher.prototype.addEventListener = function(event,callback){
	this.events[event] = this.events[event] || [];
	if ( this.events[event] ) {
		this.events[event].push(callback);
	}
};

Dispatcher.prototype.removeEventListener = function(event,callback){
	if ( this.events[event] ) {
		var listeners = this.events[event];
		for ( var i = listeners.length-1; i>=0; --i ){
			if ( listeners[i] === callback ) {
				listeners.splice( i, 1 );
				return true;
			}
		}
	}
	return false;
};

Dispatcher.prototype.dispatch = function(event){
	if ( this.events[event] ) {
		var listeners = this.events[event], len = listeners.length;
		while ( len-- ) {
			listeners[len](this);
		}		
	}
};

TitaniumOAuth.prototype = new Dispatcher();
