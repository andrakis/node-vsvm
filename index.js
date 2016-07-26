var compile = require('./lib/assembler').compile;
var VSVM = require('./lib/vm').VSVM;

/**
 *
 * Tricks:
 *   copy a value from one register to another:
 *     push reg_to_copy_from
 *     pop reg_to_copy_to
 *   jump to a label:
 *     lrl r0, $end
 *     push r0
 *     pop cp
 *     end:
 *     halt
 */

// Print: 'Hi!\n'
var print_hi = () => "lrl r0, 'H'\n" +
	   "lrl r1, 'i'\n" +
	   "lrl r2, '!'\n" +
	   "lrl r3, 10\n" +
	   "out stdout, r0\n" +
	   "out stdout, r1\n" +
	   "out stdout, r2\n" +
	   "out stdout, r3\n" +
	   "halt\n";

// print 'Hello!' by using accumulator and decumulator and
// operating on the last character pushed
var print_hello = () =>
	   // push '!'
	   "lrl r0, '!'\n" +
	   "push r0\n" +

	   "lrl ac, 0\n" +    // reset ac
	   "peek r0\n" +      // pull stored value from stack
	   "lrl r1, 78\n" +   // add 78 (using ac)
	   "push ac\n" +

	   // now want to add -3
	   "lrl dc, 0\n" +     // clear dc
	   "lrl r1, 3\n" +     // load 3
	   "push dc\n" +       // dc now has -3, push it
	   "lrl ac, 0\n" +     // clear ac
	   "pop r0\n" +        // read -3
	   "peek r0\n" +       // read 111
	   "push ac\n" +       // ac is now -3 + 111
	   "peek r0\n" +       // peek and push to duplicate
	   "push r0\n" +

	   // calculate -7 for next char
	   "lrl dc, 0\n" +     // clear dc
	   "lrl r1, 7\n" +     // load 7
	   "push dc\n" +       // dc now has -7, push it
	   "lrl ac, 0\n" +     // clear ac
	   "pop r0\n" +        // read -7
	   "peek r0\n" +       // ac is now -7 + 108
	   "push ac\n" +       // push char

	   // calculate -29 for next char
	   "lrl dc, 0\n" +     // clear dc
	   "lrl r1, 29\n" +    // load 29
	   "push dc\n" +       // dc now has -29, push it
	   "lrl ac, 0\n" +     // clear ac
	   "pop r0\n" +        // read -29
	   "peek r0\n" +       // ac is now -29 + 101
	   "push ac\n" +       // push char
	   "stat\n" +
	   "halt\n";

// Test the comment parsing and label substitution
var comment_parsing = () => `
# This is a comment
start:      # Also a comment
lrl r0, 1   # Final comment
push r0
lrl r0, '#'    # Push something in quotes
push r0
lrl r0, $start # Load a label address
stat
# Clear stack
pop r1
pop r1
# Sneaky. Endless loop here if you remove the next 3 lines
  lrl r0, $end
  push r0
  pop cp
push r0
pop cp
end:
halt
`;

var push_in_quotes = () => `
lrl r0, '#'    # Push something in quotes
push r0
stat
halt
`;

var simple_stack_testing = () =>
	   "lrl r0, 65\n" +
	   "push r0\n" +
	   "lrl r0, 0\n" +
	   "peek r0\n" +
	   "out stdout, r0\n" +
	   "pop r1\n" +
	   "out stdout, r1\n" +
	   "stat\n" +
	   "halt";

// Print the numbers 0 - 9 and halt
var print_numbers = () => `
	# uses r2 for current count
	lrl r2, 1
	# uses r3 for character to output
	# load '0' into it to begin
	lrl r3, '0'

	again:
		# print char
		out stdout, r3
		# calc r2 + 1 and store
		push r2
		lrl ac, 0
		pop r2
		lrl r0, 1
		push ac
		pop r2

		# calc r3 + 1 and store
		push r3
		lrl ac, 0
		pop r3
		lrl r0, 1
		push ac
		pop r3

		# check if r2 has reached 9 yet
		push r2
		lrl ac, 0
		lrl dc, 0
		lrl r0, 11
		push dc
		lrl ac, 0
		pop r0
		pop r0
		push ac
		pop r0
		jcmp lt0, $again

		# Print a newline
		lrl r0, 10
		out stdout, r0
		halt
`;

var interrupt_test = () => `
	idis
	lrl r0, '!'
	lrl r1, 'i'
	lrl r2, 'H'
	push r0
	push r1
	push r2
	lrl r0, $handler
	istp 42, r0 # setup interrupt
	iena # enable interrupts
	int 42
	# print newline
	lrl r0, 10
	out stdout, r0
	halt

	handler:
	stat
	pop r0   # int id (ignore, but should be 42)
	pop r1   # return addr
	pop r2   # char to print
	out stdout, r2
	pop r2
	out stdout, r2
	pop r2
	out stdout, r2
	push r1  # return to
	pop cp   # caller
`;


var compiled = compile(interrupt_test());
var vm = new VSVM(compiled);

if(1) do {
	vm.cycle();
} while (!vm.halt && !vm.int_scheduled);
