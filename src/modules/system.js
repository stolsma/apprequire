module.declare('system', [], function(require, exports, module){

	var worker = (typeof importScripts === "function");

	function sendMessage(msg, a, b) {
		if (worker)	{
			postMessage([msg, a, b]);
		} else {
			var w = window;
			
			if (window.parent && window.parent[msg])
				w = window.parent;
			
			if (w[msg]) w[msg](a, b);
		}
	}

	exports.stdio =	{
		print: function(txt, style)	{
			sendMessage("printResults", txt, style);
		}
	};
});
