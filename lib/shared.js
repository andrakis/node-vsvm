var debug = 0x1;

function dbg () {
	if(debug)
		console.log.apply(console, arguments);
}

exports.dbg = dbg;
exports.setDebug = (N) => debug = N;
exports.getDebug = ( ) => debug;
