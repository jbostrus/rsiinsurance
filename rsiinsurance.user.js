// ==UserScript==
// @name         RSI Insurance Panel Widget
// @namespace    https://robertsspaceindustries.com/
// @version      0.1
// @description  Populates a widget tag on the store front showing the insurance duration of vehicles
// @author       Jonathan Ostrus
// @match        https://robertsspaceindustries.com/store/pledge/*
// @icon         https://www.google.com/s2/favicons?domain=robertsspaceindustries.com
// @grant        none
// @updateURL    https://github.com/jbostrus/rsiinsurance/raw/main/rsiinsurance.user.js
// @downloadURL  https://github.com/jbostrus/rsiinsurance/raw/main/rsiinsurance.user.js
// ==/UserScript==

(function() {
	var GM_log; if (typeof GM_log === 'undefined') { GM_log = function (str) { console.log(str); }; }

	var debug = false;
	//var debug = true;

	function getVehicleList(akBaseNode) {
		return akBaseNode.querySelectorAll('div.BrowseListing__list > div.CardItem');
	}

	function getVehicleDetailPageUrl(akBaseWidget) {
		var vehicleLink = Array.from(akBaseWidget.querySelectorAll('a')).find(el => el.textContent === 'More Info');
		if (vehicleLink) return vehicleLink.href;
		else return '';
	}

	function fetchVehicleDetailPageHTML(asURL, akWidget) {
		var http_req = new XMLHttpRequest();
		
		http_req.open('GET', asURL, true);
		http_req.onload = function(args) {
			var HTMLData;
			if (args.target)
				HTMLData = args.target;
			else
				HTMLData = args;
			handleVehicleDetailPage(HTMLData, asURL, akWidget);
			};
		http_req.send('');
	}

	function handleVehicleDetailPage(akHTMLData, asURL, akBaseWidget) {
		if (debug) {
			GM_log('handleVehicleDetailPage()');
			GM_log('akHTMLData:');
			GM_log(akHTMLData);
			GM_log('asURL:');
			GM_log(asURL);
			GM_log('akBaseWidget:');
			GM_log(akBaseWidget);
		}
		var html_dom;
		var parser;

		html_dom = akHTMLData.responseXML;
		if (!html_dom) {
			if (akHTMLData.responseText !== "") {
	//			parser = new DOMParser();
	//			html_dom = parser.parseFromString(akHTMLData.responseText, "text/xml");
				html_dom = document.createElement('div');
				html_dom.innerHTML = akHTMLData.responseText;
			} else {
				throw "There was an error parsing XML from: " + asURL;
			}
		}
		if (debug) {
			GM_log('parsed object:');
			GM_log(html_dom);
		}

		var sInsuranceDuration = parseInsurance(html_dom);

		if (sInsuranceDuration !== '') injectInsurance(sInsuranceDuration, akBaseWidget);
	}

	function parseInsurance(akBaseNode) {
		var nodes = akBaseNode.querySelectorAll('div.package-listing > ul > li');
		for(var i=0; i<nodes.length; i++) {
			if (nodes[i].innerText.indexOf('Insurance') >= 0)
				return nodes[i].innerText;
		}
		return '';
	}

	function injectInsurance(asDuration, akWidget) {
		var baseTagContainer = akWidget.querySelector('div.WidgetTags');
		if (!baseTagContainer) {
			baseTagContainer = document.createElement('div');
			baseTagContainer.setAttribute('class', 'WidgetTags');
			var baseWidgetContainer = akWidget.querySelector('div.ItemWidget-image');
			baseWidgetContainer.appendChild(baseTagContainer);
		}
		var insuranceTag = document.createElement('p');
		insuranceTag.setAttribute('class', 'WidgetTags__text');
		insuranceTag.style['background-color'] = '#0962bf';
		insuranceTag.innerText = asDuration;
		baseTagContainer.appendChild(insuranceTag);
	}

	// checks for and handles already existing vehicle cards
	function init() {
		var nodes = getVehicleList(document);
		var url;
		for (var i=0; i<nodes.length; i++) {
			url = getVehicleDetailPageUrl(nodes[i]);
			fetchVehicleDetailPageHTML(url, nodes[i]);
		}
	}

    var rootContainer = document.querySelector('#root');

	function RegisterListener(node, callback) { node.addEventListener("DOMNodeInserted", callback, true); }
	function UnRegisterListener(node, callback) { node.removeEventListener("DOMNodeInserted", callback, true); }
    function handleStoreStartup(event) {
        var baseContainer = document.querySelector('div.BrowseListing > div.BrowseListing__list');
        if (baseContainer) {
            UnRegisterListener(rootContainer, handleStoreStartup);
            RegisterListener(baseContainer, handleInsert);
        }
    }

	// handle newly inserted cards
	function handleInsert(event) {
		if (debug) {
			GM_log('handleInsert()');
			GM_log(event);
		}	
		var strVehicleURL = getVehicleDetailPageUrl(event.target);
        if (debug) GM_log(strVehicleURL);
        if (strVehicleURL) fetchVehicleDetailPageHTML(strVehicleURL, event.target);
	}

	// register for the initial store population
	RegisterListener(rootContainer, handleStoreStartup);

	// check to handle if script was run after the store already populated
	handleStoreStartup();
	init();
})();
