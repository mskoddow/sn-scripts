var LogHelper = Class.create();

/**
 * Server side helper class for logging purposes. This class supports a debug mode. 
 *
 * @class LogHelper
 * @author Maik Skoddow
 * @see https://www.servicenow.com/community/developer-articles/just-another-log-helper/ta-p/2315453
 */
LogHelper.prototype = {
	type: 'LogHelper'
};

//name for system property that is checked whether debug mode is enabled 
LogHelper.DEBUG_PROPERTY = 'loghelper.enable.debug';

//Value of the "Source" column at table "syslog"
LogHelper._source = "ACME";


/**
 * Writes a log message to system log of type 'info' and with a given scope in case debug mode is enabled.
 */
LogHelper.debug = function(strScope, strMessage) {
	var _strDebugProperty = gs.getProperty(LogHelper.DEBUG_PROPERTY, "false");
	
	if (_strDebugProperty && _strDebugProperty === "true") {
		var _strMessage = LogHelper._getMessageStr(arguments);

		LogHelper._insertSysLogRow('-1', _strMessage);

		return _strMessage;
	}
	
	return "";
};


/**
 * Writes a log message to system log of type 'info' and with a given scope.
 */
LogHelper.info = function(strScope, strMessage) {
	var _strMessage = LogHelper._getMessageStr(arguments);

	LogHelper._insertSysLogRow('0', _strMessage);

	return _strMessage;
};


/**
 * Writes a log message to system log of type 'warn' and with a given scope.
 */
LogHelper.warn = function(strScope, strMessage) {
	var _strMessage = LogHelper._getMessageStr(arguments);

	LogHelper._insertSysLogRow('1', _strMessage);

	return _strMessage;
};


/*
 * Writes a log message to system log of type 'error' and with a given scope.
 */
LogHelper.error = function(strScope, strMessage) {
	var _strMessage = LogHelper._getMessageStr(arguments);

	LogHelper._insertSysLogRow('2', _strMessage);

	return _strMessage;
};

/**
 * Writes a log message to system log of type 'error' and with a given scope. Addtionally 
 * provided exception {e} is written to system log.
 */
LogHelper.fatal = function(strScope, strMessage, e) {
	var _strMessage = LogHelper._getMessageStr(arguments);

	LogHelper._insertSysLogRow('3', _strMessage);

	return _strMessage;
};


LogHelper._getMessageStr = function(arrArguments) {
	var _args = [];
	var _e;
  
	for (var _numIndex1 = 0; _numIndex1 < arrArguments.length; _numIndex1++) {
		if (arrArguments[_numIndex1] !== null && arrArguments[_numIndex1] !== 'undefined') {
			if (arrArguments[_numIndex1] instanceof Error) {
				_e = arrArguments[_numIndex1];
			}
			else {
				_args.push(arrArguments[_numIndex1]);
			}
		}
	}
  
	var _strFullNodeName   = GlideServlet.getSystemID();
	var _numSeparatorIndex = _strFullNodeName.indexOf(':');
	
	var _strShortNodeName  = 
		_numSeparatorIndex > 0 ?
			_strFullNodeName.substr(_numSeparatorIndex + 1) : 
			_strFullNodeName;	
 
	var _strMessage = 
		'[' +
		(_args.length === 0 ? _strShortNodeName : _strShortNodeName + '::' + _args[0].toString()) +
		'] ' +
		(_args.length < 2 ? '???' : _args[1].toString());
  
  
	for (var _numIndex2 = 2; _numIndex2 < _args.length; _numIndex2++) {
		var _strValue = JSUtil.nil(_args[_numIndex2]) ? '' : _args[_numIndex2].toString();
		
		_strMessage = _strMessage.replace(new RegExp('{' + (_numIndex2 - 2) + '}', 'g'), _strValue);
	}
  
	if (_e) {
		_strMessage = 
			_strMessage + '\n--> ' + 
			_e.message.substring(0, _e.message.length - 1) + ' in ' + _e.fileName + ' at line ' + _e.lineNumber;
	}

	return _strMessage;
};


LogHelper._insertSysLogRow = function(strLevel, strMessage) {	
	var grSysLog = new GlideRecord('syslog');
	
	grSysLog.setValue('level', strLevel);
	grSysLog.setValue('message', strMessage);
	grSysLog.setValue('source', LogHelper._source);
	grSysLog.insert();	
};
