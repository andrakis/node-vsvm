var ports = require('./ports');
var symbols = require('./symbols');
var dbg = require('./shared').dbg;
var ops;
var regs;
var ports;
var ins;

function VSVM (code) {
	// Get symbols now (any additional symbols should now be present)
	var _symbols = symbols.getSymbols();
	ops   = _symbols.ops;
	regs  = _symbols.regs;
	ins   = _symbols.ins;

	this.code = code;
	this.regs = {};
	for(var key in regs) {
		if(!key.match(/^[0-9]+$/))
			this.regs[regs[key]] = 0x0;
	}
	this.ports = [];
	this.ports.length = 3;
	this.ports[ports.stdin] = ports.port_stdin;
	this.ports[ports.stdout] = ports.port_stdout;
	this.ports[ports.stderr] = ports.port_stderr;
	this.halt = false;
	this.stack = [];
	this.interrupts = {}; // id => handler
	this.interrupts_enabled = false;
}

VSVM.prototype.cycle = function() {
	var cp = this.regs[regs.cp];
	var i  = this.code[cp];

	if(this.halt)
		return;

	if(i === undefined)
		throw 'no instruction';

	// Break down instruction
	// TODO: This is probably quicker as bit operations. Figure it out.
	var ab = new ArrayBuffer(4);
	var av = new DataView(ab);
	av.setUint32(0, i);
	op = av.getUint16(0);
	val = av.getUint16(2);
	optop = av.getUint8(0);
	opbot = av.getUint8(1);
	dbg("  Instruction:", i.toString(2), "0x" + i.toString(16));
	dbg("  Op:", op.toString(2), op);
	dbg("  Optop:", optop.toString(2), "0x" + optop.toString(16));
	dbg("  Opbot:", opbot.toString(2), "0x" + opbot.toString(16));
	dbg("  Value:", val.toString(2), "0x" + val.toString(16));

	var v = 0x0;

	switch(optop) {
		case ops.nop:
			dbg("NOP");
			break;
		case ops.lrl:
			dbg("LRL to " + regs[opbot] + ", value: " + val);
			v = this.regs[opbot] = val;
			break;
		case ops.out:
			//v = this.regs[opbot];
			dbg("OUT from reg " + regs[opbot] + "(" + this.regs[opbot] + "), port: " + val);
			this.ports[val].out(this.regs[opbot]);
			break;
		case ops.psh:
			dbg("PUSH value in reg: " + regs[opbot] + "(" + this.regs[opbot] + ")");
			this.stack.push(this.regs[opbot]);
			v = this.regs[opbot];
			break;
		case ops.pop:
			this.regs[opbot] = this.stack.pop();
			v = this.regs[opbot];
			dbg("POP to reg: " + regs[opbot] + ", got: " + this.regs[opbot]);
			break;
		case ops.peek:
			this.regs[opbot] = this.stack[this.stack.length-1];
			v = this.regs[opbot];
			dbg("PEEK to reg: " + regs[opbot] + ", got: " + this.regs[opbot]);
			break;
		case ops.jcmp:
			dbg("JCMP, jump to " + val + " if " + regs[opbot] + "(" + this.regs[opbot] + ") is !0");
			if(this.regs[opbot])
				this.regs[regs.cp] = val;
			break;
		case ops.int:
			// Interrupt functions
			var inttop = av.getUint8(2);
			var intbot = av.getUint8(3);
			dbg("    INT opstruction: 0x" + val.toString(16));
			dbg("    Top: 0x" + inttop.toString(16));
			dbg("    Bot: 0x" + intbot.toString(16));
			switch(opbot) {
				case ops.idis:
					this.interrupts_enabled = false;
					dbg("IDIS, interrupts_enabled = false");
					break;
				case ops.iena:
					this.interrupts_enabled = true;
					dbg("IENA, interrupts_enabled = true");
					break;
				case ops.istp:
					dbg("ISTP " + inttop + " using " + regs[intbot] + " (" + this.regs[intbot] + ")");
					this.setupInterrupt(inttop, this.regs[intbot]);
					break;
				case ops.iint:
					dbg("INT 0x" + inttop.toString(16) + " (" + inttop + ")");
					this.Interrupt(inttop);
					break;
				default:
					dbg("Unhandled int: 0x" + opbot.toString(16));
					break;
			}
			break;
		case 0xF:
			// Extended operations
			switch(opbot) {
				case ops.halt:
					dbg("HALT");
					this.halt = true;
					break;
				case ops.stat:
					dbg("STAT");
					console.log("CPU state:", this.getStatePretty());
					break;
				default:
					console.log("Unhandled extended op: 0x" + opbot.toString(16));
			}
			break;
		default:
			console.log("Unhandled op: 0x" + optop.toString(16));
	}
	if(v) {
		this.regs[regs.ac] += v;
		this.regs[regs.dc] -= v;
		this.regs[regs.mt0] = (v > 0 ? 1 : 0);
		this.regs[regs.lt0] = (v < 0 ? 1 : 0);
		this.regs[regs.eq0] = (v == 0 ? 1 : 0);
	}
	this.regs[regs.cp]++;
};

VSVM.prototype.getStatePretty = function() {
	var s = ['CPU State: { Registers: '];
	var x = {};
	for(var key in regs) {
		if(!key.match(/^[0-9]+$/)) {
			s.push(key + ': ' + this.regs[regs[key]]);
		}
	}
	s.push('Stack: [');
	for(var i = 0; i < this.stack.length; i++)
		s.push(i + ": " + this.stack[i]);
	s.push(']');
	return s.join(', ') + ' }';
};

VSVM.prototype.setupInterrupt = function (Id, Cp) {
	this.interrupts[Id] = Cp;
};

VSVM.prototype.deleteInterrupt = function (Id) {
	delete this.interrupts[Id];
};

VSVM.prototype.Push = function(Value) {
	this.stack.push(Value);
};

VSVM.prototype.Interrupt = function(Id) {
	dbg("    Pushing current cp (" + this.regs[regs.cp] + ")");
	this.Push(this.regs[regs.cp]);
	dbg("    Pushing int id (" + Id + ")");
	this.Push(Id);
	dbg("    Updating cp to handler (" + this.interrupts[Id].toString(16) + ")");
	this.regs[regs.cp] = this.interrupts[Id];
};

exports.VSVM = VSVM;
