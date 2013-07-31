//Ti.include("p.js");

var win = Ti.UI.createWindow({
	backgroundColor : '#fff',
	fullscreen : false,
	exitOnClose : true
});

win.open();

var api_key = "080bbb85c01048b33b3bd76bdb936abc";
var api_secret = "fd2a1cca85b821c6";
var auth_token;

var btnFlickr = Ti.UI.createButton({
	left : 10,
	top : 10,
	title : "flickr"
});

win.add(btnFlickr);

btnFlickr.addEventListener('click', function(e) {
	var xml;
	xml += '<rsp stat="ok">';
	xml += '<auth>';
	xml += ' <token>72157632758706698-11ac80b17b194593</token>';
	xml += ' <perms>delete</perms>';
	xml += ' <user nsid="93170592@N03" username="sushant_king" fullname="" />';
	xml += '</auth>';
	xml += '</rsp>';
	var XMLTools = require("XMLTools");
	var parser = new XMLTools(xml);
	//Ti.API.info(parser.toJSON());
	var jsonObj =parser.toJSON();
	//var rsp = xml.getElementsByTagName("rsp");
	alert("jsonobj = "+JSON.stringify(jsonObj));

	// http://code.google.com/p/facebook-actionscript-api/issues/detail?id=270
	// http://developers.facebook.com/docs/reference/api/publishing/
	// https://developers.facebook.com/docs/reference/api/page/#link
});

var txtCode = Ti.UI.createTextField({
	top : 10,
	backgroundColor : 'red'
});

win.add(txtCode);

var btnGreat = Ti.UI.createButton({
	right : 10,
	top : 10,
	title : "Great"
});

win.add(btnGreat);

var webView = Ti.UI.createWebView({
	top : 150,
	url : "http://www.flickr.com/auth-72157634838200449"
});

win.add(webView);

var getRssText = function(item, key) {
	return item.getElementsByTagName(key).item(0).textContent;
}


btnGreat.addEventListener('click', function(e) {
	var request = Ti.Network.createHTTPClient();
	var pageURL = "http://flickr.com/services/rest/";
	request.open("POST", pageURL);
	request.send({
		// format: "json",
		method : "flickr.auth.getFullToken",
		api_key : api_key,
		mini_token : txtCode.value,
		api_sig : Ti.Utils.md5HexDigest(api_secret + "api_key" + api_key
				+ "methodflickr.auth.getFullTokenmini_token" + txtCode.value)
	});
	request.onload = function() {
		Ti.API.info("response ==>"+ this.responseText);
		var responseDoc = this.responseXML.documentElement;
		//Ti.API.info("statValue ==>"+ responseDoc.getAttributes().item(0).nodeValue);
		var statValue = responseDoc.getAttributes().item(0).nodeValue;
		var tokenValue = responseDoc.getElementsByTagName("token").item(0).textContent;
		Ti.API.info("token ==>"+ tokenValue);
		Ti.API.info("statValue ==>"+ statValue);
		var result = {
				stat : statValue,
				auth:{
					token : tokenValue
				}
		};
		Ti.API.info("result ==>"+ JSON.stringify(result));
		if (result.stat == "ok") {
			Ti.App.token = result.auth.token;
			// alert("token:" + result.auth.token + ": username:" +
			// result.auth.user.username + ": userid:" + result.auth.user.nsid);
			
			var request1 = Ti.Network.createHTTPClient();
			var pageURL1 = "http://api.flickr.com/services/upload/";
			var api_sign = Ti.Utils.md5HexDigest(api_secret + "api_key" + api_key + "async1auth_token" + Ti.App.token+"commit"+"upload");
			Ti.API.info("token ==>"+ Ti.App.token);
			Ti.API.info("api_sign =="+api_sign);
request1.open("POST", pageURL1);
request1.send({
				api_key : api_key,
				async : 1,
				auth_token : Ti.App.token,
				title : 'testname',
				api_sig :  api_sign, //Ti.Utils.md5HexDigest(api_secret + "api_key"	+ api_key + "async1auth_token" + Ti.App.token+ "titletest name"),
				photo : win.toImage()
			});
			request1.onload = function() {
				Ti.API.info("response ==>"+ this.responseText);
				var responseDoc = this.responseXML.documentElement;
				var statValue = responseDoc.getAttributes().item(0).nodeValue;
				var result = {
						stat :statValue
				};
				Ti.API.info("result ==>"+ JSON.stringify(result));
				if (result.stat == "ok") {
					alert('photo has been successfully uploaded');
				}else if(result.stat = "fail"){
					var errorCode = responseDoc.getElementsByTagName("err").item(0).getAttributes().item(0).nodeValue;
					var errorMsg = responseDoc.getElementsByTagName("err").item(0).getAttributes().item(1).nodeValue;
					alert('Error code==> '+errorCode+ " errorMsg==> "+errorMsg);
				}
			};
			request1.onerror = function(e) {
				alert(e.error);
			};

		}
	}
	request.onerror = function(e) {
		alert(e.error);
	};
});

//Changes XML to JSON
function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};
