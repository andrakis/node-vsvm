var symbols = require('./symbols');

p_stdin  = 0x1;
p_stdout = 0x2;
p_stderr = 0x3;
ports = {};
ports.stdin = p_stdin;
ports.stdout = p_stdout;
ports.stderr = p_stderr;

symbols.setSymbol('ports', ports);

function Port (id) {
	this._in = () => 0;
	this._out = () => 0;
}
Port.prototype.in = function() {
	return this._in();
};
Port.prototype.out = function(v) {
	return this._out(v);
};

port_stdin = new Port(p_stdin); port_stdin._in = () => 0;
port_stdout = new Port(p_stdout);
	port_stdout._out = (V) => {
		process.stdout.write(String.fromCharCode(V));
	}
port_stderr = new Port(p_stderr);
	port_stderr._out = (V) => process.stderr.write(String.fromCharCode(V));

exports.Port = Port;
exports.port_stdin = port_stdin;
exports.port_stdout= port_stdout;
exports.port_stderr= port_stderr;
exports.stdin = p_stdin;
exports.stdout= p_stdout;
exports.stderr= p_stderr;
