// ==UserScript==
// @name         RSI Insurance Panel Widget
// @namespace    https://robertsspaceindustries.com/
// @version      0.2
// @description  Populates a widget tag on the store front showing the insurance duration of vehicles
// @author       Jonathan Ostrus
// @match        https://robertsspaceindustries.com/store/pledge/*
// @match        https://robertsspaceindustries.com/pledge/ships
// @icon         https://www.google.com/s2/favicons?domain=robertsspaceindustries.com
// @grant        none
// @updateURL    https://github.com/jbostrus/rsiinsurance/raw/main/rsiinsurance.user.js
// @downloadURL  https://github.com/jbostrus/rsiinsurance/raw/main/rsiinsurance.user.js
// ==/UserScript==

(function() {
    var GM_log; if (typeof GM_log === 'undefined') { GM_log = function (str) { console.log(str); }; }

    var debug = false;
    //var debug = true;

    function GetVehicleList(akBaseNode) {
        return akBaseNode.querySelectorAll('div.BrowseListing__list > div.CardItem, li.ship-item');
    }

    function GetVehicleDetailPageUrl(akBaseWidget) {
        var vehicleLink = Array.from(akBaseWidget.querySelectorAll('a')).find(el => (el.textContent === 'More Info' || el.textContent === 'View  Specs and options'));
        if (vehicleLink) return vehicleLink.href;
        else return '';
    }

    function FetchVehicleDetailPageHTML(asURL, akWidget) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', asURL, true);
        xhr.onload = function(args) {
            var requestData;
            if (args.target) requestData = args.target;
            else requestData = args;
            HandleVehicleDetailPage(requestData, asURL, akWidget);
        };
        xhr.send('');
    }

    function HandleVehicleDetailPage(akHTMLData, asURL, akBaseWidget) {
        if (debug) {
            GM_log('HandleVehicleDetailPage()');
            GM_log('akHTMLData:');
            GM_log(akHTMLData);
            GM_log('asURL:');
            GM_log(asURL);
            GM_log('akBaseWidget:');
            GM_log(akBaseWidget);
        }
        var parsedData = akHTMLData.responseXML;
        if (!parsedData) {
            if (akHTMLData.responseText !== "") {
                parsedData = document.createElement('div');
                parsedData.innerHTML = akHTMLData.responseText;
            } else {
                throw "There was an error parsing XML from: " + asURL;
            }
        }
        if (debug) {
            GM_log('parsed data object:');
            GM_log(parsedData);
        }
        var sInsuranceDuration = ParseInsurance(parsedData);
        if (sInsuranceDuration === '') sInsuranceDuration = 'N/A';
        if (debug) GM_log('Detected insurance: ' + sInsuranceDuration);
        if (sInsuranceDuration !== '') InjectInsurance(sInsuranceDuration, akBaseWidget);
    }

    function ParseInsurance(akBaseNode) {
        // look for the package details list
        var nodes = akBaseNode.querySelectorAll('div.package-listing > ul > li, #buying-options ul > li');
        for(var i=0; i<nodes.length; i++) {
            if (nodes[i].innerText.indexOf('Insurance') >= 0) {
                return nodes[i].innerText;
            }
        }
        return '';
    }

    function InjectInsurance(asDuration, akWidget) {
        var insuranceElementType = '';
        var baseWidgetContainer, baseTagContainer, insuranceTag, insuranceTag2;
        var type = 0;
        if (debug) {
            GM_log('InjectInsurance()');
            GM_log('Duration: ' + asDuration);
            GM_log('akWidget');
            GM_log(akWidget);

        }
        // determine page type
        // all ships search section
        if (akWidget.querySelector('div.bottom')) type = 1;
        // package or standalone card pages
        else if (akWidget.querySelector('div.ItemWidget-image')) type = 2;

        if (debug) GM_log('Widget type: ' + type);
        if (type == 1) {
            baseTagContainer = akWidget.querySelector('div.bottom');
            insuranceTag = document.createElement('span');
            insuranceTag.setAttribute('style', 'opacity: 1; line-height: 31px; font-size: 10px; color: #2c799f; display: inline-block; text-align: left; width: 80px;');
            insuranceTag.innerText = "Ins : ";
            insuranceTag2 = document.createElement('span');
            insuranceTag2.setAttribute('style', 'font-size: 14px; color: #6fd8ff;');
            insuranceTag2.innerText = asDuration.replace('Insurance', '').replace('Month', 'Mo');
            insuranceTag.appendChild(insuranceTag2);
            baseTagContainer.appendChild(insuranceTag);
        }
        else if (type == 2) {
            baseTagContainer = akWidget.querySelector('div.WidgetTags');
            if (!baseTagContainer) {
                baseTagContainer = document.createElement('div');
                baseTagContainer.setAttribute('class', 'WidgetTags');
                baseWidgetContainer = akWidget.querySelector('div.ItemWidget-image');
                baseWidgetContainer.appendChild(baseTagContainer);
            }
            insuranceTag = document.createElement('p');
            insuranceTag.setAttribute('class', 'WidgetTags__text');
            insuranceTag.style['background-color'] = '#0962bf';
            insuranceTag.innerText = asDuration;
            baseTagContainer.appendChild(insuranceTag);
        }
    }

    function CheckNodes(akBaseNode) {
        var nodeList = GetVehicleList(akBaseNode);
        var url;
        for (var i=0; i<nodeList.length; i++) {
            url = GetVehicleDetailPageUrl(nodeList[i]);
            FetchVehicleDetailPageHTML(url, nodeList[i]);
        }
    }

    var rootContainer = document.querySelector('#root');
    var searchContainer = document.querySelector('#search-results > div.inner');

    function RegisterListener(akNode, akCallback) { akNode.addEventListener("DOMNodeInserted", akCallback, true); }
    function UnRegisterListener(akNode, akCallback) { akNode.removeEventListener("DOMNodeInserted", akCallback, true); }

    function HandleStoreCardStartup(akEvent) {
        var baseContainer = document.querySelector('div.BrowseListing > div.BrowseListing__list');
        if (baseContainer) {
            UnRegisterListener(rootContainer, HandleStoreCardStartup);
            RegisterListener(baseContainer, HandleCardInsert);
        }
    }

    function HandleSearchContainerInsert(akEvent) {
        if (debug) {
            GM_log('HandleSearchContainerInsert()');
            GM_log(akEvent.target.nodeName);
            GM_log(akEvent);
            GM_log(akEvent.target);
        }
        if (akEvent.target.nodeName === 'UL') {
            CheckNodes(akEvent.target);
        }
    }

    // handle newly inserted cards
    function HandleCardInsert(akEvent) {
        if (debug) {
            GM_log('HandleCardInsert()');
            GM_log(akEvent.target.nodeName);
            GM_log(akEvent);
        }
        var strVehicleURL;
        strVehicleURL = GetVehicleDetailPageUrl(akEvent.target);
        if (debug) GM_log(strVehicleURL);
        if (strVehicleURL) FetchVehicleDetailPageHTML(strVehicleURL, akEvent.target);
    }

    // register for the initial store population for packages and standalone ship card style
    if (rootContainer) {
        RegisterListener(rootContainer, HandleStoreCardStartup);
        // trigger a check in case the dom loaded while we were registering
        HandleStoreCardStartup();
    }
    // if not try the search style
    else if (searchContainer) {
        RegisterListener(searchContainer, HandleSearchContainerInsert);
    }

    // check to handle if script was run after the store already populated
    CheckNodes(document);
})();
