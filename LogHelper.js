var LogHelper = Class.create();

/**
* Server side helper class for logging purposes. This class supports a debug mode. 
* If enabled via system property log statements are written to Sys Log.
*
* @class LogHelper
* @author Maik Skoddow
* @see https://www.servicenow.com/community/developer-articles/just-another-log-helper/ta-p/2315453
*/
LogHelper.prototype = {

	initialize: function(
		strTableName
	) {
		this._strTableName = strTableName;

		if (!gs.tableExists(strTableName)) {
			throw new Error(
				'Table "' + strTableName + '" does not exist in that instance!'
			);
		}

		var _strAbsoluteBase = 
			String(GlideDBObjectManager.get().getAbsoluteBase(strTableName));

		if (_strAbsoluteBase !== 'syslog') {
			throw new Error(
				'Table "' + strTableName + '" is not a child of the "syslog" table!'
			);
		}
	},


	debug: function(
		strSource, 
		strMessage		
	) {
		if (gs.getProperty(LogHelper.DEBUG_PROPERTY, "false") === "true") {
			return LogHelper._insertLogRow(
				this._strTableName, 
				LogHelper.LOG_LEVELS.DEBUG, 
				strSource, 
				LogHelper._getMessageStr(arguments) || strMessage
			);
		}

		return '';
	},


	info: function(
		strSource, 
		strMessage		
	) {
		return LogHelper._insertLogRow(
			this._strTableName, 
			LogHelper.LOG_LEVELS.INFO, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	},


	warn: function(
		strSource, 
		strMessage		
	) {
		return LogHelper._insertLogRow(
			this._strTableName, 
			LogHelper.LOG_LEVELS.WARN, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	},


	error: function(
		strSource, 
		strMessage		
	) {
		return LogHelper._insertLogRow(
			this._strTableName, 
			LogHelper.LOG_LEVELS.ERROR, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	},


	fatal: function(
		strSource, 
		strMessage		
	) {
		return LogHelper._insertLogRow(
			this._strTableName, 
			LogHelper.LOG_LEVELS.FATAL, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	},


	type: 'LogHelper'
};


//name for system property that is checked whether debug mode is enabled 
LogHelper.DEBUG_PROPERTY = 'loghelper.enable.debug';

//target tabe if used with static methods 
LogHelper.STANDARD_LOG_TABLE = 'syslog';

LogHelper.LOG_LEVELS = {
    DEBUG : '-1',
    INFO  : '0',
    WARN  : '1',
    ERROR : '2',
    FATAL : '3'
};


LogHelper.debug = 
	function(
		strSource, 
		strMessage
	) {
		if (gs.getProperty(LogHelper.DEBUG_PROPERTY, "false") === "true") {
			return LogHelper._insertLogRow(
				LogHelper.STANDARD_LOG_TABLE, 
				LogHelper.LOG_LEVELS.DEBUG, 
				strSource, 
				LogHelper._getMessageStr(arguments) || strMessage
			);
		}

		return '';
	};


LogHelper.info = 
	function(
		strSource, 
		strMessage
	) {
		return LogHelper._insertLogRow(
			LogHelper.STANDARD_LOG_TABLE, 
			LogHelper.LOG_LEVELS.INFO, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	};


LogHelper.warn = 
	function(
		strSource, 
		strMessage
	) {
		return LogHelper._insertLogRow(
			LogHelper.STANDARD_LOG_TABLE, 
			LogHelper.LOG_LEVELS.WARN, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	};


LogHelper.error = 
	function(
		strSource, 
		strMessage
	) {
		return LogHelper._insertLogRow(
			LogHelper.STANDARD_LOG_TABLE, 
			LogHelper.LOG_LEVELS.ERROR, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	};


LogHelper.fatal = 
	function(
		strSource, 
		strMessage
	) {
		return LogHelper._insertLogRow(
			LogHelper.STANDARD_LOG_TABLE, 
			LogHelper.LOG_LEVELS.FATAL, 
			strSource, 
			LogHelper._getMessageStr(arguments) || strMessage
		);
	};


LogHelper._getMessageStr = 
	function(
		arrArguments
	) {
		var _args       = [];
		var _arrMessage = [];
		var _e;

		for (var numIndex = 1; numIndex < arrArguments.length; numIndex++) {
			if (arrArguments[numIndex] !== null && 
				arrArguments[numIndex] !== 'undefined'
			) {
				if (arrArguments[numIndex] instanceof Error	||
					String(arrArguments[numIndex]).startsWith('org.mozilla.javascript.')
				) {
					_e = arrArguments[numIndex];
				}
				else {
					_args.push(arrArguments[numIndex]);
				}
			}
		}
	

		var _strMessage = 
			_args.length < 1 ? 
				'???' : 
				_args[0].toString();
	
		for (var _numIndex = 1; _numIndex < _args.length; _numIndex++) {
			var _strValue = 
				JSUtil.nil(_args[_numIndex]) ? 
					'' : 
					_args[_numIndex].toString();
			
			_strMessage = 
				_strMessage.replace(
					new RegExp('{' + (_numIndex - 1) + '}', 'g'), 
					_strValue
				);
		}

		_arrMessage.push(_strMessage);

	
		if (_e) {
			_arrMessage.push('\n--> ');
			
			if (_e instanceof Error) {
				_arrMessage.push(_e.message);
				_arrMessage.push('\n');

				if (_e.stack) {
					_arrMessage.push(
						_e.stack
							.split('\n')
							.slice(0, 4)
							.filter(function(line) {
								return line.trim().length > 0;
							})
							.map(function (line) {
								return '---> ' + line.trim();
							})
							.join('\n')
					);
				}
			}
			else {
				_arrMessage.push(String(_e));
			}
		}

		return _arrMessage.join('');
	};


LogHelper._insertLogRow = 
	function(
		strTableName,
		strLevel, 
		strSource, 
		strMessage
	) {	
		var _grLog      = new GlideRecord(strTableName);
		var _strNextSeq = GlideCounter.next(strTableName + '::sequence');
		
		_grLog.setValue('level', strLevel);
		_grLog.setValue('source', strSource);
		_grLog.setValue('message', strMessage);
		_grLog.setValue('sequence', _strNextSeq);

		_grLog.insert();

		return strMessage;
	};
