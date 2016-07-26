var symbols = require('./symbols');
var dbg = require('./shared').dbg;
var plist_cache = {};

n = (N) => N || 0
m8888 = (A, B, C, D) => {
	// 32bit number
	var ab = new ArrayBuffer(4);
	var vw = new DataView(ab);
	vw.setUint8(0, A);
	vw.setUint8(1, B);
	vw.setUint8(2, C);
	vw.setUint8(3, D);
	return vw.getUint32(0);
};
m8816 = (A, B, C) => {
	var ab = new ArrayBuffer(4);
	var vw = new DataView(ab);
	vw.setUint8(0, A);
	vw.setUint8(1, B);
	vw.setUint16(2, C);
	return vw.getUint32(0);
};
// multi op: single 32bit number specifies 8bit instruction, 8bit register (if any),
//           and 16bit number for value
//mi = (I, O, V) => [(((n(I) << 0) | (n(O) << 8)) << 8) | n(V)]
//mi = (I, O, V) => [(((n(I) << 4) | O) << 8) | n(V)]
mi = (I, O, V) => [m8816(I, O, V)];
// simple op: single 32bit number specifies 16bit instruction, and a 16bit number
//           for value.
mi1 = (I, V)   => [m8816(I, 0, V)];
// TODO: WRONG
// extended op: single 32bit number specifies 8bit instruction, 8bit register (if any),
//           an 8bit value, and a 32bit secondary value
mi2 = (I, O, V1, V2) => [mi(I, O, V1), n(V2)]
bits = (N) => N.toString(2)

_nop = () => mi(o_nop, 0x0, 0x0)
_lrl = (Reg, Lit) => mi(o_lrl, Reg, Lit)
_lra = (Reg, Adr) => mi(o_lra, Reg, Adr)
_rlr = (R0, R1)   => mi(o_rlr, R0,  R1)
_in  = (Port)     => mi(o_in,  Port, 0x0)
_out = (Port, Reg)=> mi(o_out, Reg, Port)
_push= (Value)    => mi(o_psh, Value, 0x0)
_pop = (Reg)      => mi(o_pop,  Reg, 0x0)
_peek= (Reg)      => mi(o_peek, Reg, 0x0)
_stle= ()         => mi(o_stle, 0x0, 0x0)
_jcmp= (WhichReg, Location) =>
	mi(o_jcmp, WhichReg, Location)
_xor = (Reg, Mask)=> mi(o_xor, Reg, Mask)
_halt= ()         => mi(o_ext, o_e_halt, 0)
_stat= ()         => mi(o_ext, o_e_stat, 0)
_idis= ()         => mi(o_int, o_idis, 0x0 << 8)
_iena= ()         => mi(o_int, o_iena, 0x0 << 8)
_istp= (Id, Reg)  => mi(o_int, o_istp, (Id << 8) | Reg)
_idel= (Id)       => mi(o_int, o_del,  (Id << 8))
_int=  (Id)       => mi(o_int, o_iint, (Id << 8))
ins = {};
ins.nop = _nop;
ins.lrl = _lrl;
ins.lra = _lra;
ins.rlr = _rlr;
ins.in  = _in;
ins.out = _out;
ins.push= _push;
ins.pop = _pop;
ins.peek= _peek;
ins.stle= _stle;
ins.jcmp= _jcmp;
ins.xor = _xor;
ins.halt=_halt;
ins.stat=_stat;
ins.idis=_idis;
ins.iena=_iena;
ins.istp=_istp;
ins.idel=_idel;
ins.int =_int;

symbols.setSymbol('ins', ins);

// Extended instructions take more than a 32bit instruction size.
// Their total size is indicated by this table, which is currently empty.
var extended_ins = {
};

const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

var regex_allowable_symbol = new RegExp(/^\$([A-Za-z_$][A-Za-z0-9_$]*)/);
var regex_label = new RegExp(/^\s*([A-Za-z_$][A-Za-z0-9_$]*):/);

function compile (c) {
	lines = c.split("\n");
	var state = { symbols: {}, data: [] };
	// Order:
	//  1 Parse all lines, clean them of comments, and insert placeholders
	//  2 Parse all lines again, converting them to instruction creation
	//    calls. That is, return something like: [ 'lrl', 'r0', '$end' ]
	//  3 Parse instruction creation lists:
	//    - each opcode defaults to a single 32bit number.
	//    - some opcodes are extended and may be 32+16bits
	//    - Produce an output list that resolves symbol addresses by
	//      keeping a running count of bytes output (depending on opcode)
	//      and setting symbols to equal their occurance position
	//  4 Parse instruction creation lists again and call instruction
	//    creation function with resolved parameters.
	// Stage 1 and 2:
	var result = lines.map(line => compile_line(line, state));
	// Stage 3:
	// Instead of counting bytes, we're just counting ops here.
	// This is because we're not currently using a byte-based memory format.
	// Presently any operation takes a single memory location, regardless of size
	var ins_counter = 0;
	result.forEach(ic => {
		if(ic.length == 0)
			return;
		var i = ic[0];
		var params = ic.slice(1);
		dbg(` St3: instruction: ${i}, params:`, params);
		/* Not used: not using byte-based memory
		if(extended_ins[i])
			ins_counter++;
		*/
		var label = i.match(regex_label);
		if(label) {
			var name = label[1];
			dbg(`Found label '${name}' at estimate pos: ${ins_counter}`);
			if(state.symbols[name] !== undefined) {
				dbg(`WARN: Symbol redefinition of '${name}'`, state.symbols[name]);
			}
			// change the instruction to a nop
			ic[0] = 'nop';
			state.symbols[name] = ins_counter;
		}
		ins_counter++;
	});
	dbg("Stage 3 state:", state);
	// Stage 4
	result = result.map(ic => {
		// This time we'll go through params and replace $symbols.
		// Then we'll call the instruction generation function
		if(ic.length == 0) return [];
		ic = ic.map((I, Index) => {
			if(Index == 0) return I; // skip instruction, only do parameters
			if(typeof I == 'string') {
				var m = I.match(regex_allowable_symbol);
				var name = m[1];
				dbg(" St4:", m);
				if(state.symbols[name] === undefined) {
					throw 'could not resolve: $' + name;
				}
				return state.symbols[name];
			}
			return I;
		});
		// Call instruction creation function with params
		var i = ic[0];
		var params = ic.slice(1);
		return ins[i].apply({}, params);
	});
	result = flatten(result);
	dbg("\n\nFinal result:\n\n",result.map(N=>"0x"+N.toString(16)));
	return result;
}

function compile_line (line, state) {
	line = remove_comments(line).trim();
	if(line.length == 0) return [  ];
	var m;
	m = line.match(regex_label);
	if(m) {
		var label = m[1];
		dbg('Label:', label);
		state.symbols[label] = undefined; // will be filled later
		return [ m[1] + ':' ];
	}
	m = line.match(/^([A-Za-z]+)(?: (.*$))?/);
	dbg(m);
	if(!m) throw 'unable to parse: ' + line;
	var i = m[1];
	var params = m[2] ? m[2].trim() : undefined;
	var found = ins[i];
	if(found) {
		return compile_ins(i, params, state);
	} else {
		throw "unknown ins: " + i;
	}
}

function remove_comments (line) {
	var in_speech = false, speech_type = "";
	var comment = '#', in_comment = false;
	var out = "";
	line.split('').forEach((C) => {
		//console.log(`ch: ${C}, in_sp: ${in_speech}, st: ${speech_type}, in_c: ${in_comment}`);
		if(in_comment) return;
		switch(C) {
			case comment:
				if(!in_speech) {
					in_comment = true;
				} else {
					out += C;
				}
				break;
			case '"':
				if(!in_speech) {
					speech_type = '"';
					in_speech = true;
				} else if(in_speech && speech_type == '"') {
					in_speech = false;
				}
				out += C;
				break;
			case "'":
				if(!in_speech) {
					speech_type = "'";
					in_speech = true;
				} else if(in_speech && speech_type == "'") {
					in_speech = false;
				}
				out += C;
				break;
			default:
				out += C;
				break;
		}
	});
	return out;
}

function compile_ins (i, params, state) {
	// Parse function to get the parameters
	var plist = plist_cache[i];
	var req_params;
	var req_pcount;
	if(!plist) {
		plist = plist_cache[i] = ins[i].toString().match(/^\(([^)]+)\)/);
	}
	// Params?
	if(plist) {
		plist = plist[1];
		req_params = plist.split(',');
		req_pcount = req_params.length;
	} else {
		plist = "";
		req_params = [];
		req_pcount = req_params.length;
	}
	var giv_params = [];
	if(params)
		giv_params = params.split(',');
	var giv_pcount = giv_params.length;
	if(giv_pcount != req_pcount) {
		dbg("Invalid number of parameters given for instruction `" + i + "`");
		dbg("Instruction: " + ins[i]);
		dbg("Given: " + params);
		dbg("Expected: " + plist);
		dbg("Given(" + giv_pcount + "), expected(" + req_pcount + ")");
	}
	var parse_params = giv_params.map(compile_ins_param);
	dbg(parse_params);
	return [i].concat(parse_params); //ins[i].apply({}, parse_params);
}

function compile_ins_param (p) {
	p = p.trim();
	var result = compile_ins_param_inner(p);
	dbg("Parse `" + p + "` into: " + result);
	return result;
}
function compile_ins_param_inner (p) {
	var m;
	// Matches: 123, 0xF23, 0123. Whole numbers only.
	if(m = p.match(/(?:^0x[A-Fa-f0-9]+)|(?:^[0-9]+)|(?:^0[0-9]+)/)) {
		dbg("Parse number", m);
		return parseInt(p);
	}
	// Matches: 'H' for ascii value
	m = p.match(/^(?:'([^']+)')/);
	dbg(p, m);
	if(m) {
		var ch = m[1];
		if(ch[0] == '\\')
			ch = ch[1];
		dbg("Parse charcode of `" + ch + "` to: " + ch.charCodeAt(0));
		return ch.charCodeAt(0);
	}
	// Matches $symbol
	if(p[0] == '$') return p;
	var syms = symbols.getSymbols();
	for(var key in syms) {
		for(var name in syms[key]) {
			if(name == p) {
				dbg("Found matching name in " + key + "/" + name);
				return syms[key][name];
			}
		}
	}
	throw 'unknown symbol: ' + p;
}

exports.compile = compile;
