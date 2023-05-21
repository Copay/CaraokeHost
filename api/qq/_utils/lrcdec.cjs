// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

if (ENVIRONMENT_IS_NODE) {
  if (typeof process == 'undefined' || !process.release || process.release.name !== 'node') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  var nodeVersion = process.versions.node;
  var numericVersion = nodeVersion.split('.').slice(0, 3);
  numericVersion = (numericVersion[0] * 10000) + (numericVersion[1] * 100) + (numericVersion[2].split('-')[0] * 1);
  var minVersion = 101900;
  if (numericVersion < 101900) {
    throw new Error('This emscripten-generated code requires node v10.19.19.0 (detected v' + nodeVersion + ')');
  }

  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');
  var nodePath = require('path');

  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = nodePath.dirname(scriptDirectory) + '/';
  } else {
    scriptDirectory = __dirname + '/';
  }

// include: node_shell_read.js
read_ = (filename, binary) => {
  var ret = tryParseAsDataURI(filename);
  if (ret) {
    return binary ? ret : ret.toString();
  }
  // We need to re-wrap `file://` strings to URLs. Normalizing isn't
  // necessary in that case, the path should already be absolute.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return fs.readFileSync(filename, binary ? undefined : 'utf8');
};

readBinary = (filename) => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
    ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
};

readAsync = (filename, onload, onerror, binary = true) => {
  var ret = tryParseAsDataURI(filename);
  if (ret) {
    onload(ret);
  }
  // See the comment in the `read_` function.
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
    if (err) onerror(err);
    else onload(binary ? data.buffer : data);
  });
};

// end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  process.on('uncaughtException', (ex) => {
    // suppress ExitStatus exceptions from showing an error
    if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
      throw ex;
    }
  });

  // Without this older versions of node (< v15) will log unhandled rejections
  // but return 0, which is not normally the desired behaviour.  This is
  // not be needed with node v15 and about because it is now the default
  // behaviour:
  // See https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode
  var nodeMajor = process.versions.node.split(".")[0];
  if (nodeMajor < 15) {
    process.on('unhandledRejection', (reason) => { throw reason; });
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

  Module['inspect'] = () => '[Emscripten Module object]';

} else
if (ENVIRONMENT_IS_SHELL) {

  if ((typeof process == 'object' && typeof require === 'function') || typeof window == 'object' || typeof importScripts == 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  if (typeof read != 'undefined') {
    read_ = (f) => {
      const data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  readBinary = (f) => {
    let data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer == 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data == 'object');
    return data;
  };

  readAsync = (f, onload, onerror) => {
    setTimeout(() => onload(readBinary(f)), 0);
  };

  if (typeof clearTimeout == 'undefined') {
    globalThis.clearTimeout = (id) => {};
  }

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit == 'function') {
    quit_ = (status, toThrow) => {
      // Unlike node which has process.exitCode, d8 has no such mechanism. So we
      // have no way to set the exit code and then let the program exit with
      // that code when it naturally stops running (say, when all setTimeouts
      // have completed). For that reason, we must call `quit` - the only way to
      // set the exit code - but quit also halts immediately.  To increase
      // consistency with node (and the web) we schedule the actual quit call
      // using a setTimeout to give the current stack and any exception handlers
      // a chance to run.  This enables features such as addOnPostRun (which
      // expected to be able to run code after main returns).
      setTimeout(() => {
        if (!(toThrow instanceof ExitStatus)) {
          let toLog = toThrow;
          if (toThrow && typeof toThrow == 'object' && toThrow.stack) {
            toLog = [toThrow, toThrow.stack];
          }
          err('exiting due to exception: ' + toLog);
        }
        quit(status);
      });
      throw toThrow;
    };
  }

  if (typeof print != 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console == 'undefined') console = /** @type{!Console} */({});
    console.log = /** @type{!function(this:Console, ...*): undefined} */ (print);
    console.warn = console.error = /** @type{!function(this:Console, ...*): undefined} */ (typeof printErr != 'undefined' ? printErr : print);
  }

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != 'undefined' && document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }

  if (!(typeof window == 'object' || typeof importScripts == 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {
// include: web_or_worker_shell_read.js
read_ = (url) => {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  }

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  readAsync = (url, onload, onerror) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  }

// end include: web_or_worker_shell_read.js
  }

  setWindowTitle = (title) => document.title = title;
} else
{
  throw new Error('environment detection error');
}

var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;
checkIncomingModuleAPI();

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments'];legacyModuleProp('arguments', 'arguments_');

if (Module['thisProgram']) thisProgram = Module['thisProgram'];legacyModuleProp('thisProgram', 'thisProgram');

if (Module['quit']) quit_ = Module['quit'];legacyModuleProp('quit', 'quit_');

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
assert(typeof Module['read'] == 'undefined', 'Module.read option was removed (modify read_ in JS)');
assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify setWindowTitle in JS)');
assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
legacyModuleProp('read', 'read_');
legacyModuleProp('readAsync', 'readAsync');
legacyModuleProp('readBinary', 'readBinary');
legacyModuleProp('setWindowTitle', 'setWindowTitle');
var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");


// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];legacyModuleProp('wasmBinary', 'wasmBinary');
var noExitRuntime = Module['noExitRuntime'] || true;legacyModuleProp('noExitRuntime', 'noExitRuntime');

// include: wasm2js.js
// wasm2js.js - enough of a polyfill for the WebAssembly object so that we can load
// wasm2js code that way.

// Emit "var WebAssembly" if definitely using wasm2js. Otherwise, in MAYBE_WASM2JS
// mode, we can't use a "var" since it would prevent normal wasm from working.
/** @suppress{duplicate, const} */
var
WebAssembly = {
  // Note that we do not use closure quoting (this['buffer'], etc.) on these
  // functions, as they are just meant for internal use. In other words, this is
  // not a fully general polyfill.
  /** @constructor */
  Memory: function(opts) {
    this.buffer = new ArrayBuffer(opts['initial'] * 65536);
  },

  Module: function(binary) {
    // TODO: use the binary and info somehow - right now the wasm2js output is embedded in
    // the main JS
  },

  /** @constructor */
  Instance: function(module, info) {
    // TODO: use the module somehow - right now the wasm2js output is embedded in
    // the main JS
    // This will be replaced by the actual wasm2js code.
    this.exports = (
function instantiate(info) {
function Table(ret) {
  // grow method not included; table is not growable
  ret.set = function(i, func) {
    this[i] = func;
  };
  ret.get = function(i) {
    return this[i];
  };
  return ret;
}

  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 65536, "IUAjKSgqJCUxMjNaWEMhQCFAIykoTkhMaW52YWxpZCBsaXRlcmFsL2xlbmd0aHMgc2V0AGludmFsaWQgY29kZSBsZW5ndGhzIHNldAB1bmtub3duIGhlYWRlciBmbGFncyBzZXQAaW52YWxpZCBkaXN0YW5jZXMgc2V0AGludmFsaWQgYml0IGxlbmd0aCByZXBlYXQAdG9vIG1hbnkgbGVuZ3RoIG9yIGRpc3RhbmNlIHN5bWJvbHMAaW52YWxpZCBzdG9yZWQgYmxvY2sgbGVuZ3RocwBpbnZhbGlkIGNvZGUgLS0gbWlzc2luZyBlbmQtb2YtYmxvY2sAaW5jb3JyZWN0IGhlYWRlciBjaGVjawBpbmNvcnJlY3QgbGVuZ3RoIGNoZWNrAGluY29ycmVjdCBkYXRhIGNoZWNrAGludmFsaWQgZGlzdGFuY2UgdG9vIGZhciBiYWNrAGhlYWRlciBjcmMgbWlzbWF0Y2gAaW52YWxpZCB3aW5kb3cgc2l6ZQBpbnZhbGlkIGJsb2NrIHR5cGUAaW52YWxpZCBsaXRlcmFsL2xlbmd0aCBjb2RlAGludmFsaWQgZGlzdGFuY2UgY29kZQB1bmtub3duIGNvbXByZXNzaW9uIG1ldGhvZAAxLjIuMTEAAAAAAA4EDQECDwsIAwoGDAUJAAcADwcEDgINAQoGDAsJBQMIBAEOCA0GAgsPDAkHAwoFAA8MCAIECQEHBQsDDgoABg0PAQgOBgsDBAkHAg0MAAUKAw0EBw8CCA8MAAEKBgkLBQAOBwsKBA0BBQgMBgkDAg8NCAoBAw8EAgsGBwwABQ4JCgAJDgYDDwUBDQwHCwQCCA0HAAkDBAYKAggFDgwLDwENBgQJCA8DAAsBAgwFCg4HAQoNAAYJCAcEDw4DCwUCDAcNDgMABgkKAQIIBQsMBA8NCAsFBg8AAwQHAgwBCg4JCgYJAAwLBw0PAQMOBQIIBAMPAAYKCg0ICQQFCwwHAg4CDAQBBwoLBggFAw8NAA4JDgsCDAQHDQEFAA8KAwkIBgQCAQsKDQcIDwkMBQYDAA4LCAwHAQ4CDQYPAAkKBAUDDAEKDwkCBggADQMEDgcFCwoPBAIHDAkFBgENDgALAwgJDg8FAggMAwcABAoBDQsGBAMCDAkFDwoLDgEHBgAIDQQLAg4PAAgNAwwJBwUKBgENAAsHBAkBCg4DBQwCDwgGAQQLDQwDBw4KDwYIAAUJAgYLDQgBBAoHCQUADw4CAwwNAggEBg8LAQoJAw4FAAwHAQ8NCAoDBwQMBQYLAA4JAgcLBAEJDA4CAAYKDQ8DBQgCAQ4HBAoIDQ8MCQADBQYLAQAAAAEAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAABAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAQAAADgAAAAwAAAAKAAAACAAAAAYAAAAEAAAAAgAAAAAAAAAOQAAADEAAAApAAAAIQAAABkAAAARAAAACQAAAAEAAAA6AAAAMgAAACoAAAAiAAAAGgAAABIAAAAKAAAAAgAAADsAAAAzAAAAKwAAACMAAAA+AAAANgAAAC4AAAAmAAAAHgAAABYAAAAOAAAABgAAAD0AAAA1AAAALQAAACUAAAAdAAAAFQAAAA0AAAAFAAAAPAAAADQAAAAsAAAAJAAAABwAAAAUAAAADAAAAAQAAAAbAAAAEwAAAAsAAAADAAAADQAAABAAAAAKAAAAFwAAAAAAAAAEAAAAAgAAABsAAAAOAAAABQAAABQAAAAJAAAAFgAAABIAAAALAAAAAwAAABkAAAAHAAAADwAAAAYAAAAaAAAAEwAAAAwAAAABAAAAKAAAADMAAAAeAAAAJAAAAC4AAAA2AAAAHQAAACcAAAAyAAAALAAAACAAAAAvAAAAKwAAADAAAAAmAAAANwAAACEAAAA0AAAALQAAACkAAAAxAAAAIwAAABwAAAAfAAAAAAAAAJYwB3csYQ7uulEJmRnEbQeP9GpwNaVj6aOVZJ4yiNsOpLjceR7p1eCI2dKXK0y2Cb18sX4HLbjnkR2/kGQQtx3yILBqSHG5895BvoR91Noa6+TdbVG11PTHhdODVphsE8Coa2R6+WL97Mllik9cARTZbAZjYz0P+vUNCI3IIG47XhBpTORBYNVycWei0eQDPEfUBEv9hQ3Sa7UKpfqotTVsmLJC1sm720D5vKzjbNgydVzfRc8N1txZPdGrrDDZJjoA3lGAUdfIFmHQv7X0tCEjxLNWmZW6zw+lvbieuAIoCIgFX7LZDMYk6Quxh3xvLxFMaFirHWHBPS1mtpBB3HYGcdsBvCDSmCoQ1e+JhbFxH7W2BqXkv58z1LjooskHeDT5AA+OqAmWGJgO4bsNan8tPW0Il2xkkQFcY+b0UWtrYmFsHNgwZYVOAGLy7ZUGbHulARvB9AiCV8QP9cbZsGVQ6bcS6ri+i3yIufzfHd1iSS3aFfN804xlTNT7WGGyTc5RtTp0ALyj4jC71EGl30rXldg9bcTRpPv01tNq6WlD/NluNEaIZ63QuGDacy0EROUdAzNfTAqqyXwN3TxxBVCqQQInEBALvoYgDMkltWhXs4VvIAnUZrmf5GHODvneXpjJ2SkimNCwtKjXxxc9s1mBDbQuO1y9t61susAgg7jttrO/mgzitgOa0rF0OUfV6q930p0VJtsEgxbccxILY+OEO2SUPmptDahaanoLzw7knf8JkyeuAAqxngd9RJMP8NKjCIdo8gEe/sIGaV1XYvfLZ2WAcTZsGecGa252G9T+4CvTiVp62hDMSt1nb9+5+fnvvo5DvrcX1Y6wYOij1tZ+k9GhxMLYOFLy30/xZ7vRZ1e8pt0GtT9LNrJI2isN2EwbCq/2SgM2YHoEQcPvYN9V32eo745uMXm+aUaMs2HLGoNmvKDSbyU24mhSlXcMzANHC7u5FgIiLyYFVb47usUoC72yklq0KwRqs1yn/9fCMc/QtYue2Swdrt5bsMJkmybyY+yco2p1CpNtAqkGCZw/Ng7rhWcHchNXAAWCSr+VFHq44q4rsXs4G7YMm47Skg2+1eW379x8Id/bC9TS04ZC4tTx+LPdaG6D2h/NFr6BWya59uF3sG93R7cY5loIiHBqD//KOwZmXAsBEf+eZY9prmL40/9rYUXPbBZ44gqg7tIN11SDBE7CswM5YSZnp/cWYNBNR2lJ23duPkpq0a7cWtbZZgvfQPA72DdTrrypxZ673n/Pskfp/7UwHPK9vYrCusowk7NTpqO0JAU20LqTBtfNKVfeVL9n2SMuemazuEphxAIbaF2UK28qN74LtKGODMMb3wVaje8CLQAAAABGO2dljHbOyspNqa9Z6+1OH9CKK9WdI4STpkThstbbnfTtvPg+oBVXeJtyMus9NtOtBlG2Z0v4GSFwn3wlq8bgY5ChhandCCrv5m9PfEArrjp7TMvwNuVktg2CAZd9HX3RRnoYGwvTt10wtNLOlvAziK2XVkLgPvkE21mcC1D8Gk1rm3+HJjLQwR1VtVK7EVQUgHYx3s3fnpj2uPu5hieH/71A4jXw6U1zy44o4G3KyaZWraxsGwQDKiBjZi77OvpowF2foo30MOS2k1V3ENe0MSuw0ftmGX69XX4bnC3hZ9oWhgIQWy+tVmBIyMXGDCmD/WtMSbDC4w+LpYYWoPg1UJufUJrWNv/c7VGaT0sVewlwch7DPduxhQa81KR2I6jiTUTNKADtYm47igf9nc7mu6apg3HrACw30GdJMws+1XUwWbC/ffAf+UaXemrg05ss27T+5pYdUaCtejSB3eVIx+aCLQ2rK4JLkEzn2DYIBp4Nb2NUQMbMEnuhqR3wBC9by2NKkYbK5de9rYBEG+lhAiCOBMhtJ6uOVkDOrybfsukduNcjUBF4ZWt2HfbNMvyw9lWZerv8NjyAm1M4W8LPfmClqrQtDAXyFmtgYbAvgSeLSOTtxuFLq/2GLoqNGVLMtn43BvvXmEDAsP3TZvQclV2TeV8QOtYZK12zLEDxa2p7lg6gNj+h5g1YxHWrHCUzkHtA+d3S77/mtYqelir22K1NkxLg5DxU24NZx33HuIFGoN1LCwlyDTBuFwnrN4tP0FDuhZ35QcOmniRQANrFFju9oNx2FA+aTXNquz3sFv0Gi3M3SyLccXBFueLWAVik7WY9bqDPkiibqPcnEA1xYStqFKtmw7vtXaTefvvgPzjAh1ryjS71tLZJkJXG1uzT/bGJGbAYJl+Lf0PMLTuiihZcx0Bb9WgGYJINArvLkUSArPSOzQVbyPZiPltQJt8da0G61yboFZEdj3CwbRAM9lZ3aTwb3sZ6ILmj6Yb9Qq+9midl8DOII8tU7TrgCV582247tpbHlPCtoPFjC+QQJTCDde99KtqpRk2/iDbSw84NtaYEQBwJQnt7bNHdP42X5ljoXavxRxuQliIfS8++WXCo25M9AXTVBmYRRqAi8ACbRZXK1uw6jO2LX62dFCPrpnNGIeva6WfQvYz0dvltsk2eCHgAN6c+O1DCMbD1RHeLkiG9xjuO+/1c62hbGAouYH9v5C3WwKIWsaWDZi7ZxV1JvA8Q4BNJK4d22o3Dl5y2pPJW+w1dEMBqOBQbM6RSIFTBmG39bt5WmgtN8N7qC8u5j8GGECCHvXdFps3oOeD2j1wquybzbIBBlv8mBXe5HWISc1DLvTVrrNgAAAAAWIDi1/EGtHSphlaj4g1o6bqNij4TC9ydS4s+SoUdoQndnUPedBsVfSyb96pnEMngP5ArN5YWfZTOlp9DCjtCE1K7oMT7PfZno70UsOg2KvqwtsgtGTCejkGwfFmPJuMa16YBzX4gV24moLW5bSuL8zWraSScLT+HxK3dUBR2hCZM9mbx5XAwUr3w0oX2e+zPrvsOGAd9WLtf/bpskWslL8nrx/hgbZFbOO1zjHNmTcYr5q8RgmD5strgG2UeTcY1Rs0k4u9LckG3y5CW/ECu3KTATAsNRhqoVcb4f5tQZzzD0IXralbTSDLWMZ95XQ/VId3tAohbu6HQ21l2KOwITXBs6prZ6rw5gWpe7srhYKSSYYJzO+fU0GNnNget8alE9XFLk1z3HTAEd//nT/zBrRd8I3q++nXZ5nqXDiLXSl56V6iJ09H+KotRHP3A2iK3mFrAYDHclsNpXHQUp8rrV/9KCYBWzF8jDky99EXHg74dR2FptME3yuxB1R08moxrZBpuvM2cOB+VHNrI3pfkgoYXBlUvkVD2dxGyIbmHLWLhB8+1SIGZFhABe8FbikWLAwqnXKqM8f/yDBMoNqHOeG4hLK/Hp3oMnyeY29SsppGMLERGJaoS5X0q8DKzvG9x6zyNpkK62wUaOjnSUbEHmAkx5U+gt7Ps+DdRO1DYEZoIWPNNod6l7vleRzmy1Xlz6lWbpEPTzQcbUy/Q1cWwk41FUkQkwwTnfEPmMDfI2HpvSDqtxs5sDp5Ojtla41OJAmOxXqvl5/3zZQUquO47YOBu2bdJ6I8UEWhtw9/+8oCHfhBXLvhG9HZ4pCM985ppZXN4vsz1Lh2UdczKRK6VvBwud2u1qCHI7SjDH6aj/VX+Ix+CV6VJIQ8lq/bBszS1mTPWYjC1gMFoNWIWI75cXHs+vovSuOgoijgK/06V168WFTV4v5Nj2+cTgQysmL9G9BhdkV2eCzIFHunly4h2ppMIlHE6jsLSYg4gBSmFHk9xBfyY2IOqO4ADSOx4NBnXILT7AIkyraPRsk90mjlxPsK5k+lrP8VKM78nnf0puN6lqVoJDC8MqlSv7n0fJNA3R6Qy4O4iZEO2ooaUcg9bxCqPuRODCe+w24kNZ5ACMy3IgtH6YQSHWTmEZY73EvrNr5IYGgYUTrlelKxuFR+SJE2fcPPkGSZQvJnEh2xCnfE0wn8mnUQphcXEy1KOT/UY1s8Xz39JQWwnyaO76V88+LHf3i8YWYiMQNlqWwtSVBFT0rbG+lTgZaLUArJmed/iPvk9NZd/a5bP/4lBhHS3C9z0Vdx1cgN/LfLhqONkfuu75Jw8EmLKn0riKEgBaRYCWen01fBvonao70ChAAAAAOG2Uu+Da9QFYt2G6gbXqAvnYfrkhbx8DmQKLuEMrlEX7RgD+I/FhRJuc9f9Cnn5HOvPq/OJEi0ZaKR/9hhcoy756vHBmzd3K3qBJcQeiwsl/z1Zyp3g3yB8Vo3PFPLyOfVEoNaXmSY8di900xIlWjLzkwjdkU6ON3D43NgwuEZd0Q4UsrPTklhSZcC3Nm/uVtfZvLm1BDpTVLJovDwWF0rdoEWlv33DT17LkaA6wb9B23ftrrmqa0RYHDmrKOTlc8lSt5yrjzF2SjljmS4zTXjPhR+XrViZfUzuy5IkSrRkxfzmi6chYGFGlzKOIp0cb8MrToCh9shqQECahWBwjbqBxt9V4xtZvwKtC1BmpyWxhxF3XuXM8bQEeqNbbN7crY1ojkLvtQioDgNaR2oJdKaLvyZJ6WKgowjU8kx4LC6UmZp8e/tH+pEa8ah+fvuGn59N1HD9kFKaHCYAdXSCf4OVNC1s9+mrhhZf+WlyVdeIk+OFZ/E+A40QiFFiUMjL57F+mQjTox/iMhVNDVYfY+y3qTED1XS36TTC5QZcZprwvdDIH98NTvU+uxwaWrEy+7sHYBTZ2ub+OGy0EUiUaMmpIjomy/+8zCpJ7iNOQ8DCr/WSLc0oFMcsnkYoRDo53qWMazHHUe3bJue/NELtkdWjW8M6wYZF0CAwFz+B5muuYFA5QQKNv6vjO+1EhzHDpWaHkUoEWheg5exFT41IOrls/mhWDiPuvO+VvFOLn5KyainAXQj0RrfpQhRYmbrIgHgMmm8a0RyF+2dOap9tYIt+2zJkHAa0jv2w5mGVFJmXdKLLeBZ/TZL3yR99k8MxnHJ1Y3MQqOWZ8R63drFeLfNQ6H8cMjX59tODqxm3iYX4Vj/XFzTiUf3VVAMSvfB85FxGLgs+m6jh3y36Drsn1O9akYYAOEwA6tn6UgWpAo7dSLTcMippWtjL3wg3r9Um1k5jdDksvvLTzQigPKWs38pEGo0lJscLz8dxWSCje3fBQs0lLiAQo8TBpvEr4ZbmFAAgtPti/TIRg0tg/udBTh8G9xzwZCqaGoWcyPXtOLcDDI7l7G5TYwaP5THp6+8fCApZTedohMsNiTKZ4vnKRToYfBfVeqGRP5sXw9D/He0xHqu/3nx2OTSdwGvb9WQULRTSRsJ2D8Aol7mSx/OzvCYSBe7JcNhoI5FuOszRLqBJMJjyplJFdEyz8yaj1/kIQjZPWq1UktxHtSSOqN2A8V48NqOxXuslW79dd7TbV1lVOuELulg8jVC5it+/yXIDZyjEUYhKGddiq6+Fjc+lq2wuE/mDTM5/aa14LYbF3FJwJGoAn0a3hnWnAdSawwv6eyK9qJRAYC5+odZ8kQAAAABDy6aHx5A81IRbmlPPJwhzjOyu9Ai3NKdLfJIgnk8Q5t2EtmFZ3ywyGhSKtVFoGJUSo74SlvgkQdUzgsZ9mVEXPlL3kLoJbcP5wstEsr5ZZPF1/+N1LmWwNuXDN+PWQfGgHed2JEZ9JWeN26Is8UmCbzrvBethdVaoqtPR+jKjLrn5Bak9op/6fmk5fTUVq1123g3a8oWXibFOMQ5kfbPIJ7YVT6PtjxzgJimbq1q7u+iRHTxsyodvLwEh6Ier8jnEYFS+QDvO7QPwaGpIjPpKC0dczY8cxp7M12AZGeTi31ovRFjedN4Lnb94jNbD6qyVCEwrEVPWeFKYcP/0ZUZdt67g2jP1eolwPtwOO0JOLniJ6Kn80nL6vxnUfWoqVrsp4fA8rbpqb+5xzOilDV7I5sb4T2KdYhwhVsSbifwXSso3sc1ObCueDaeNGUbbHzkFELm+gUsj7cKAhWoXswesVHihK9AjO3iT6J3/2JQP35tfqVgfBDMLXM+VjA5X5XNNnEP0ycfZp4oMfyDBcO0AgrtLhwbg0dRFK3dTkBj1ldPTUxJXiMlBFENvxl8//eYc9FthmK/BMttkZ7VzzrRkMAUS47ReiLD3lS43vOm8F/8iGpB7eYDDOLImRO2BpIKuSgIFKhGYVmnaPtEipqzxYW0KduU2kCWm/Tai6MuMuqsAKj0vW7BubJAW6SfshMlkJyJO4Hy4HaO3Hpp2hJxcNU8627EUoIjy3wYPuaOUL/poMqh+M6j7PfgOfJVS3a3WmXsqUsLheREJR/5addXeGb5zWZ3l6QreLk+NCx3NS0jWa8zMjfGfj0ZXGMQ6xTiH8WO/A6r57EBhX2sS+S+UUTKJE9VpE0CWorXH3d4n554VgWAaThszWYW9tIy2P3LPfZn1SyYDpgjtpSFDkTcBAFqRhoQBC9XHyq1Sb2B+gyyr2ASo8EJX6zvk0KBHdvDjjNB3Z9dKJCQc7KPxL25lsuTI4ja/UrF1dPQ2PghmFn3DwJH5mFrCulP8RRyuyudfZWxg2z72M5j1ULTTicKUkEJkExQZ/kBX0ljHguHaAcEqfIZFcebVBrpAUk3G0nIODXT1ilbupsmdSCFhN5vwIvw9d6anpyTlbAGjrhCTg+3bNQRpgK9XKksJ0P94ixa8sy2ROOi3wnsjEUUwX4Nlc5Ql4vfPv7G0BBk25pxpyaVXz04hDFUdYsfzmim7YbpqcMc97itdbq3g++l403kvOxjfqL9DRfv8iON8t/RxXPQ/19twZE2IM6/rD5sFON7Yzp5ZXJUECh9eoo1UIjCtF+mWKpOyDHnQear+BUooOEaBjr/C2hTsgRGya8ptIEuJpobMDf0cn042uhgQABEAEgAAAAgABwAJAAYACgAFAAsABAAMAAMADQACAA4AAQAPAAAAAAAAAAAAAABgBwAAAAhQAAAIEAAUCHMAEgcfAAAIcAAACDAAAAnAABAHCgAACGAAAAggAAAJoAAACAAAAAiAAAAIQAAACeAAEAcGAAAIWAAACBgAAAmQABMHOwAACHgAAAg4AAAJ0AARBxEAAAhoAAAIKAAACbAAAAgIAAAIiAAACEgAAAnwABAHBAAACFQAAAgUABUI4wATBysAAAh0AAAINAAACcgAEQcNAAAIZAAACCQAAAmoAAAIBAAACIQAAAhEAAAJ6AAQBwgAAAhcAAAIHAAACZgAFAdTAAAIfAAACDwAAAnYABIHFwAACGwAAAgsAAAJuAAACAwAAAiMAAAITAAACfgAEAcDAAAIUgAACBIAFQijABMHIwAACHIAAAgyAAAJxAARBwsAAAhiAAAIIgAACaQAAAgCAAAIggAACEIAAAnkABAHBwAACFoAAAgaAAAJlAAUB0MAAAh6AAAIOgAACdQAEgcTAAAIagAACCoAAAm0AAAICgAACIoAAAhKAAAJ9AAQBwUAAAhWAAAIFgBACAAAEwczAAAIdgAACDYAAAnMABEHDwAACGYAAAgmAAAJrAAACAYAAAiGAAAIRgAACewAEAcJAAAIXgAACB4AAAmcABQHYwAACH4AAAg+AAAJ3AASBxsAAAhuAAAILgAACbwAAAgOAAAIjgAACE4AAAn8AGAHAAAACFEAAAgRABUIgwASBx8AAAhxAAAIMQAACcIAEAcKAAAIYQAACCEAAAmiAAAIAQAACIEAAAhBAAAJ4gAQBwYAAAhZAAAIGQAACZIAEwc7AAAIeQAACDkAAAnSABEHEQAACGkAAAgpAAAJsgAACAkAAAiJAAAISQAACfIAEAcEAAAIVQAACBUAEAgCARMHKwAACHUAAAg1AAAJygARBw0AAAhlAAAIJQAACaoAAAgFAAAIhQAACEUAAAnqABAHCAAACF0AAAgdAAAJmgAUB1MAAAh9AAAIPQAACdoAEgcXAAAIbQAACC0AAAm6AAAIDQAACI0AAAhNAAAJ+gAQBwMAAAhTAAAIEwAVCMMAEwcjAAAIcwAACDMAAAnGABEHCwAACGMAAAgjAAAJpgAACAMAAAiDAAAIQwAACeYAEAcHAAAIWwAACBsAAAmWABQHQwAACHsAAAg7AAAJ1gASBxMAAAhrAAAIKwAACbYAAAgLAAAIiwAACEsAAAn2ABAHBQAACFcAAAgXAEAIAAATBzMAAAh3AAAINwAACc4AEQcPAAAIZwAACCcAAAmuAAAIBwAACIcAAAhHAAAJ7gAQBwkAAAhfAAAIHwAACZ4AFAdjAAAIfwAACD8AAAneABIHGwAACG8AAAgvAAAJvgAACA8AAAiPAAAITwAACf4AYAcAAAAIUAAACBAAFAhzABIHHwAACHAAAAgwAAAJwQAQBwoAAAhgAAAIIAAACaEAAAgAAAAIgAAACEAAAAnhABAHBgAACFgAAAgYAAAJkQATBzsAAAh4AAAIOAAACdEAEQcRAAAIaAAACCgAAAmxAAAICAAACIgAAAhIAAAJ8QAQBwQAAAhUAAAIFAAVCOMAEwcrAAAIdAAACDQAAAnJABEHDQAACGQAAAgkAAAJqQAACAQAAAiEAAAIRAAACekAEAcIAAAIXAAACBwAAAmZABQHUwAACHwAAAg8AAAJ2QASBxcAAAhsAAAILAAACbkAAAgMAAAIjAAACEwAAAn5ABAHAwAACFIAAAgSABUIowATByMAAAhyAAAIMgAACcUAEQcLAAAIYgAACCIAAAmlAAAIAgAACIIAAAhCAAAJ5QAQBwcAAAhaAAAIGgAACZUAFAdDAAAIegAACDoAAAnVABIHEwAACGoAAAgqAAAJtQAACAoAAAiKAAAISgAACfUAEAcFAAAIVgAACBYAQAgAABMHMwAACHYAAAg2AAAJzQARBw8AAAhmAAAIJgAACa0AAAgGAAAIhgAACEYAAAntABAHCQAACF4AAAgeAAAJnQAUB2MAAAh+AAAIPgAACd0AEgcbAAAIbgAACC4AAAm9AAAIDgAACI4AAAhOAAAJ/QBgBwAAAAhRAAAIEQAVCIMAEgcfAAAIcQAACDEAAAnDABAHCgAACGEAAAghAAAJowAACAEAAAiBAAAIQQAACeMAEAcGAAAIWQAACBkAAAmTABMHOwAACHkAAAg5AAAJ0wARBxEAAAhpAAAIKQAACbMAAAgJAAAIiQAACEkAAAnzABAHBAAACFUAAAgVABAIAgETBysAAAh1AAAINQAACcsAEQcNAAAIZQAACCUAAAmrAAAIBQAACIUAAAhFAAAJ6wAQBwgAAAhdAAAIHQAACZsAFAdTAAAIfQAACD0AAAnbABIHFwAACG0AAAgtAAAJuwAACA0AAAiNAAAITQAACfsAEAcDAAAIUwAACBMAFQjDABMHIwAACHMAAAgzAAAJxwARBwsAAAhjAAAIIwAACacAAAgDAAAIgwAACEMAAAnnABAHBwAACFsAAAgbAAAJlwAUB0MAAAh7AAAIOwAACdcAEgcTAAAIawAACCsAAAm3AAAICwAACIsAAAhLAAAJ9wAQBwUAAAhXAAAIFwBACAAAEwczAAAIdwAACDcAAAnPABEHDwAACGcAAAgnAAAJrwAACAcAAAiHAAAIRwAACe8AEAcJAAAIXwAACB8AAAmfABQHYwAACH8AAAg/AAAJ3wASBxsAAAhvAAAILwAACb8AAAgPAAAIjwAACE8AAAn/ABAFAQAXBQEBEwURABsFARARBQUAGQUBBBUFQQAdBQFAEAUDABgFAQIUBSEAHAUBIBIFCQAaBQEIFgWBAEAFAAAQBQIAFwWBARMFGQAbBQEYEQUHABkFAQYVBWEAHQUBYBAFBAAYBQEDFAUxABwFATASBQ0AGgUBDBYFwQBABQAAAwAEAAUABgAHAAgACQAKAAsADQAPABEAEwAXABsAHwAjACsAMwA7AEMAUwBjAHMAgwCjAMMA4wACAQAAAAAAABAAEAAQABAAEAAQABAAEAARABEAEQARABIAEgASABIAEwATABMAEwAUABQAFAAUABUAFQAVABUAEADCAEEAAAABAAIAAwAEAAUABwAJAA0AEQAZACEAMQBBAGEAgQDBAAEBgQEBAgEDAQQBBgEIAQwBEAEYASABMAFAAWAAAAAAEAAQABAAEAARABEAEgASABMAEwAUABQAFQAVABYAFgAXABcAGAAYABkAGQAaABoAGwAbABwAHAAdAB0AQABAAA==");
  base64DecodeToExistingUint8Array(bufferView, 74624, "kCUBAA==");
  base64DecodeToExistingUint8Array(bufferView, 74628, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
}
function asmFunc(imports) {
 var env = imports.env;
 var memory = env.memory;
 var buffer = memory.buffer;
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var fimport$0 = env.emscripten_memcpy_big;
 var fimport$1 = env.emscripten_resize_heap;
 var global$0 = 65536;
 var global$1 = 0;
 var global$2 = 0;
 var global$3 = 0;
 var i64toi32_i32$HIGH_BITS = 0;
 // EMSCRIPTEN_START_FUNCS
;
 function $0() {
  $33();
 }
 
 function $1($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $37_1 = 0, $117 = 0;
  $4_1 = global$0 - 96 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 88 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 84 | 0) >> 2] = $1_1;
  HEAP32[($4_1 + 80 | 0) >> 2] = -2;
  HEAP32[($4_1 + 20 | 0) >> 2] = 262144;
  HEAP32[($4_1 + 16 | 0) >> 2] = $28(HEAP32[($4_1 + 20 | 0) >> 2] | 0 | 0) | 0;
  label$1 : {
   label$2 : {
    if ((HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0) {
     break label$2
    }
    HEAP32[($4_1 + 92 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP32[($4_1 + 56 | 0) >> 2] = 0;
   HEAP32[($4_1 + 60 | 0) >> 2] = 0;
   HEAP32[($4_1 + 64 | 0) >> 2] = 0;
   HEAP32[($4_1 + 24 | 0) >> 2] = HEAP32[($4_1 + 88 | 0) >> 2] | 0;
   HEAP32[($4_1 + 28 | 0) >> 2] = HEAP32[($4_1 + 84 | 0) >> 2] | 0;
   HEAP32[($4_1 + 36 | 0) >> 2] = HEAP32[($4_1 + 16 | 0) >> 2] | 0;
   HEAP32[($4_1 + 40 | 0) >> 2] = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
   label$3 : {
    if (!($17($4_1 + 24 | 0 | 0, 66021 | 0, 56 | 0) | 0)) {
     break label$3
    }
    $29(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0);
    HEAP32[($4_1 + 92 | 0) >> 2] = 0;
    break label$1;
   }
   label$4 : {
    label$5 : while (1) {
     label$6 : {
      if (HEAP32[($4_1 + 28 | 0) >> 2] | 0) {
       break label$6
      }
      break label$4;
     }
     HEAP32[($4_1 + 80 | 0) >> 2] = $18($4_1 + 24 | 0 | 0, 0 | 0) | 0;
     $37_1 = HEAP32[($4_1 + 80 | 0) >> 2] | 0;
     label$7 : {
      label$8 : {
       if (($37_1 + 4 | 0) >>> 0 < 2 >>> 0) {
        break label$8
       }
       if (($37_1 | 0) != (2 | 0)) {
        break label$7
       }
      }
      $20($4_1 + 24 | 0 | 0) | 0;
      $29(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0);
      HEAP32[($4_1 + 92 | 0) >> 2] = 0;
      break label$1;
     }
     label$9 : {
      label$10 : {
       if (HEAP32[($4_1 + 40 | 0) >> 2] | 0) {
        break label$10
       }
       if (!((HEAP32[($4_1 + 80 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
        break label$9
       }
      }
      break label$4;
     }
     HEAP32[($4_1 + 12 | 0) >> 2] = $30(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0, (HEAP32[($4_1 + 20 | 0) >> 2] | 0) << 1 | 0 | 0) | 0;
     label$11 : {
      label$12 : {
       if (!((HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
        break label$12
       }
       HEAP32[($4_1 + 16 | 0) >> 2] = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
       HEAP32[($4_1 + 36 | 0) >> 2] = (HEAP32[($4_1 + 16 | 0) >> 2] | 0) + (HEAP32[($4_1 + 20 | 0) >> 2] | 0) | 0;
       HEAP32[($4_1 + 40 | 0) >> 2] = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
       HEAP32[($4_1 + 20 | 0) >> 2] = (HEAP32[($4_1 + 20 | 0) >> 2] | 0) << 1 | 0;
       break label$11;
      }
      $20($4_1 + 24 | 0 | 0) | 0;
      $29(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0);
      HEAP32[($4_1 + 92 | 0) >> 2] = 0;
      break label$1;
     }
     continue label$5;
    };
   }
   $20($4_1 + 24 | 0 | 0) | 0;
   label$13 : {
    if (!((HEAP32[($4_1 + 80 | 0) >> 2] | 0 | 0) != (1 | 0) & 1 | 0)) {
     break label$13
    }
    $29(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0);
    HEAP32[($4_1 + 92 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP32[($4_1 + 20 | 0) >> 2] = (HEAP32[($4_1 + 20 | 0) >> 2] | 0) - (HEAP32[($4_1 + 40 | 0) >> 2] | 0) | 0;
   HEAP32[($4_1 + 8 | 0) >> 2] = $30(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0, (HEAP32[($4_1 + 20 | 0) >> 2] | 0) + 1 | 0 | 0) | 0;
   label$14 : {
    label$15 : {
     if (!((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) != (0 | 0) & 1 | 0)) {
      break label$15
     }
     HEAP32[($4_1 + 16 | 0) >> 2] = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
     break label$14;
    }
    $29(HEAP32[($4_1 + 16 | 0) >> 2] | 0 | 0);
    HEAP32[($4_1 + 92 | 0) >> 2] = 0;
    break label$1;
   }
   HEAP8[((HEAP32[($4_1 + 16 | 0) >> 2] | 0) + (HEAP32[($4_1 + 20 | 0) >> 2] | 0) | 0) >> 0] = 0;
   HEAP32[($4_1 + 92 | 0) >> 2] = HEAP32[($4_1 + 16 | 0) >> 2] | 0;
  }
  $117 = HEAP32[($4_1 + 92 | 0) >> 2] | 0;
  global$0 = $4_1 + 96 | 0;
  return $117 | 0;
 }
 
 function $2($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $32_1 = 0;
  $4_1 = global$0 - 320 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 316 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 312 | 0) >> 2] = $1_1;
  $9(65536 | 0, $4_1 + 16 | 0 | 0, 1 | 0);
  HEAP32[($4_1 + 12 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0) < (HEAP32[($4_1 + 312 | 0) >> 2] | 0 | 0) & 1 | 0)) {
     break label$1
    }
    $10((HEAP32[($4_1 + 316 | 0) >> 2] | 0) + (HEAP32[($4_1 + 12 | 0) >> 2] | 0) | 0 | 0, (HEAP32[($4_1 + 316 | 0) >> 2] | 0) + (HEAP32[($4_1 + 12 | 0) >> 2] | 0) | 0 | 0, $4_1 + 16 | 0 | 0);
    HEAP32[($4_1 + 12 | 0) >> 2] = (HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 8 | 0;
    continue label$2;
   };
  }
  $32_1 = $1(HEAP32[($4_1 + 316 | 0) >> 2] | 0 | 0, HEAP32[($4_1 + 312 | 0) >> 2] | 0 | 0) | 0;
  global$0 = $4_1 + 320 | 0;
  return $32_1 | 0;
 }
 
 function $3($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, $7_1 = 0;
  $4_1 = global$0 - 16 | 0;
  global$0 = $4_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  $7_1 = $2(HEAP32[($4_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) | 0;
  global$0 = $4_1 + 16 | 0;
  return $7_1 | 0;
 }
 
 function $4($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] = ((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 31 | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 30 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 29 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 28 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 27 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 26 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 25 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) & 1 | 0) << 24 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 23 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 22 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 21 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 20 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 19 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 18 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 17 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) & 1 | 0) << 16 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 15 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 14 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 13 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 12 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 11 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 10 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 9 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 8 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 7 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 6 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 5 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 4 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 3 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 2 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 1 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 0 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] = ((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 31 | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 30 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 29 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 28 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 27 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 26 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 25 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 7 | 0) & 1 | 0) << 24 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 23 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 22 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 21 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 20 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 19 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 18 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 17 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 5 | 0) & 1 | 0) << 16 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 15 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 14 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 13 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 12 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 11 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 10 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 9 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 3 | 0) & 1 | 0) << 8 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 7 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 6 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 5 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 4 | 0) | 0 | (((((HEAPU8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 3 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 2 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 1 | 0) | 0 | (((((HEAPU8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) >> 1 | 0) & 1 | 0) << 0 | 0) | 0;
  return;
 }
 
 function $5($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 16 | 0;
  HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 3 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 24 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 24 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 16 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 16 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 8 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 8 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 0 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 0 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 2 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 25 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 25 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 17 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 17 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 9 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 9 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 1 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 1 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 1 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 26 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 26 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 18 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 18 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 10 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 10 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 2 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 2 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[(HEAP32[($4_1 + 8 | 0) >> 2] | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 27 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 27 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 19 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 19 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 11 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 11 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 3 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 3 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 7 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 28 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 28 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 20 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 20 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 12 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 12 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 4 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 4 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 6 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 29 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 29 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 21 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 21 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 13 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 13 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 5 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 5 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 5 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 30 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 30 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 22 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 22 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 14 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 14 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 6 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 6 | 0) & 1 | 0) << 0 | 0) | 0;
  HEAP8[((HEAP32[($4_1 + 8 | 0) >> 2] | 0) + 4 | 0) >> 0] = (((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 31 | 0) & 1 | 0) << 7 | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 31 | 0) & 1 | 0) << 6 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 23 | 0) & 1 | 0) << 5 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 23 | 0) & 1 | 0) << 4 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 15 | 0) & 1 | 0) << 3 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 15 | 0) & 1 | 0) << 2 | 0) | 0 | ((((HEAP32[((HEAP32[($4_1 + 12 | 0) >> 2] | 0) + 4 | 0) >> 2] | 0) >>> 7 | 0) & 1 | 0) << 1 | 0) | 0 | ((((HEAP32[(HEAP32[($4_1 + 12 | 0) >> 2] | 0) >> 2] | 0) >>> 7 | 0) & 1 | 0) << 0 | 0) | 0;
  return;
 }
 
 function $6($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0;
  $4_1 = global$0 - 32 | 0;
  HEAP32[($4_1 + 28 | 0) >> 2] = $0_1;
  HEAP32[($4_1 + 24 | 0) >> 2] = $1_1;
  HEAP32[($4_1 + 12 | 0) >> 2] = (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 31 | 0) & -2147483648 | 0) >>> 0 | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & -268435456 | 0) >>> 1 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 4 | 0) & -2147483648 | 0) >>> 5 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 3 | 0) & -2147483648 | 0) >>> 6 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 251658240 | 0) >>> 3 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 8 | 0) & -2147483648 | 0) >>> 11 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 7 | 0) & -2147483648 | 0) >>> 12 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 15728640 | 0) >>> 5 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 12 | 0) & -2147483648 | 0) >>> 17 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 11 | 0) & -2147483648 | 0) >>> 18 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 983040 | 0) >>> 7 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 16 | 0) & -2147483648 | 0) >>> 23 | 0) | 0;
  HEAP32[($4_1 + 8 | 0) >> 2] = (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 15 | 0) & -2147483648 | 0) >>> 0 | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 61440 | 0) << 15 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 20 | 0) & -2147483648 | 0) >>> 5 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 19 | 0) & -2147483648 | 0) >>> 6 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 3840 | 0) << 13 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 24 | 0) & -2147483648 | 0) >>> 11 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 23 | 0) & -2147483648 | 0) >>> 12 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 240 | 0) << 11 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 28 | 0) & -2147483648 | 0) >>> 17 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 27 | 0) & -2147483648 | 0) >>> 18 | 0) | 0 | (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) & 15 | 0) << 9 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 0 | 0) & -2147483648 | 0) >>> 23 | 0) | 0;
  HEAP8[($4_1 + 18 | 0) >> 0] = ((HEAP32[($4_1 + 12 | 0) >> 2] | 0) >>> 24 | 0) & 255 | 0;
  HEAP8[($4_1 + 19 | 0) >> 0] = ((HEAP32[($4_1 + 12 | 0) >> 2] | 0) >>> 16 | 0) & 255 | 0;
  HEAP8[($4_1 + 20 | 0) >> 0] = ((HEAP32[($4_1 + 12 | 0) >> 2] | 0) >>> 8 | 0) & 255 | 0;
  HEAP8[($4_1 + 21 | 0) >> 0] = ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) >>> 24 | 0) & 255 | 0;
  HEAP8[($4_1 + 22 | 0) >> 0] = ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) >>> 16 | 0) & 255 | 0;
  HEAP8[($4_1 + 23 | 0) >> 0] = ((HEAP32[($4_1 + 8 | 0) >> 2] | 0) >>> 8 | 0) & 255 | 0;
  HEAP8[($4_1 + 18 | 0) >> 0] = ((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[(HEAP32[($4_1 + 24 | 0) >> 2] | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP8[($4_1 + 19 | 0) >> 0] = ((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 1 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP8[($4_1 + 20 | 0) >> 0] = ((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 2 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP8[($4_1 + 21 | 0) >> 0] = ((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 3 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP8[($4_1 + 22 | 0) >> 0] = ((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 4 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP8[($4_1 + 23 | 0) >> 0] = ((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) ^ ((HEAPU8[((HEAP32[($4_1 + 24 | 0) >> 2] | 0) + 5 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP32[($4_1 + 28 | 0) >> 2] = ((HEAPU8[(((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 32 | 0 | (((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 31 | 0) >> 1 | 0) | 0 | (((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 4 | 0) | 0) + 66032 | 0) >> 0] | 0) & 255 | 0) << 28 | 0 | (((HEAPU8[((((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 32 | 0 | ((((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 31 | 0) >> 1 | 0) | 0 | ((((((HEAPU8[($4_1 + 18 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 1 | 0) << 4 | 0) | 0) + 66096 | 0) >> 0] | 0) & 255 | 0) << 24 | 0) | 0 | (((HEAPU8[((((((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 32 | 0 | ((((((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 31 | 0) >> 1 | 0) | 0 | ((((((HEAPU8[($4_1 + 19 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 1 | 0) << 4 | 0) | 0) + 66160 | 0) >> 0] | 0) & 255 | 0) << 20 | 0) | 0 | (((HEAPU8[(((((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 32 | 0 | (((((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 31 | 0) >> 1 | 0) | 0 | (((((HEAPU8[($4_1 + 20 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 1 | 0) << 4 | 0) | 0) + 66224 | 0) >> 0] | 0) & 255 | 0) << 16 | 0) | 0 | (((HEAPU8[(((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 32 | 0 | (((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 31 | 0) >> 1 | 0) | 0 | (((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) >> 2 | 0) & 1 | 0) << 4 | 0) | 0) + 66288 | 0) >> 0] | 0) & 255 | 0) << 12 | 0) | 0 | (((HEAPU8[((((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 32 | 0 | ((((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 31 | 0) >> 1 | 0) | 0 | ((((((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 255 | 0) & 3 | 0) << 4 | 0 | (((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) >> 4 | 0) | 0) & 1 | 0) << 4 | 0) | 0) + 66352 | 0) >> 0] | 0) & 255 | 0) << 8 | 0) | 0 | (((HEAPU8[((((((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 32 | 0 | ((((((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 31 | 0) >> 1 | 0) | 0 | ((((((HEAPU8[($4_1 + 22 | 0) >> 0] | 0) & 255 | 0) & 15 | 0) << 2 | 0 | (((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) >> 6 | 0) | 0) & 1 | 0) << 4 | 0) | 0) + 66416 | 0) >> 0] | 0) & 255 | 0) << 4 | 0) | 0 | ((HEAPU8[(((((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 32 | 0 | (((((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 31 | 0) >> 1 | 0) | 0 | (((((HEAPU8[($4_1 + 23 | 0) >> 0] | 0) & 255 | 0) & 63 | 0) & 1 | 0) << 4 | 0) | 0) + 66480 | 0) >> 0] | 0) & 255 | 0) | 0;
  HEAP32[($4_1 + 28 | 0) >> 2] = (((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 15 | 0) & -2147483648 | 0) >>> 0 | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 6 | 0) & -2147483648 | 0) >>> 1 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 19 | 0) & -2147483648 | 0) >>> 2 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 20 | 0) & -2147483648 | 0) >>> 3 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 28 | 0) & -2147483648 | 0) >>> 4 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 11 | 0) & -2147483648 | 0) >>> 5 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 27 | 0) & -2147483648 | 0) >>> 6 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 16 | 0) & -2147483648 | 0) >>> 7 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 0 | 0) & -2147483648 | 0) >>> 8 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 14 | 0) & -2147483648 | 0) >>> 9 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 22 | 0) & -2147483648 | 0) >>> 10 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 25 | 0) & -2147483648 | 0) >>> 11 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 4 | 0) & -2147483648 | 0) >>> 12 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 17 | 0) & -2147483648 | 0) >>> 13 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 30 | 0) & -2147483648 | 0) >>> 14 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 9 | 0) & -2147483648 | 0) >>> 15 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 1 | 0) & -2147483648 | 0) >>> 16 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 7 | 0) & -2147483648 | 0) >>> 17 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 23 | 0) & -2147483648 | 0) >>> 18 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 13 | 0) & -2147483648 | 0) >>> 19 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 31 | 0) & -2147483648 | 0) >>> 20 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 26 | 0) & -2147483648 | 0) >>> 21 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 2 | 0) & -2147483648 | 0) >>> 22 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 8 | 0) & -2147483648 | 0) >>> 23 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 18 | 0) & -2147483648 | 0) >>> 24 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 12 | 0) & -2147483648 | 0) >>> 25 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 29 | 0) & -2147483648 | 0) >>> 26 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 5 | 0) & -2147483648 | 0) >>> 27 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 21 | 0) & -2147483648 | 0) >>> 28 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 10 | 0) & -2147483648 | 0) >>> 29 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 3 | 0) & -2147483648 | 0) >>> 30 | 0) | 0 | ((((HEAP32[($4_1 + 28 | 0) >> 2] | 0) << 24 | 0) & -2147483648 | 0) >>> 31 | 0) | 0;
  return HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0;
 }
 
 function $7($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, i64toi32_i32$2 = 0, $285 = 0, $328 = 0, $366 = 0, $373 = 0, $380 = 0, $387 = 0, $394 = 0, $401 = 0, $405 = 0, $409 = 0;
  $5_1 = global$0 - 512 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 508 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 504 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 500 | 0) >> 2] = $2_1;
  i64toi32_i32$2 = 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66600 | 0) >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66604 | 0) >> 2] | 0;
  $366 = i64toi32_i32$0;
  i64toi32_i32$0 = $5_1 + 472 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $366;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66592 | 0) >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66596 | 0) >> 2] | 0;
  $373 = i64toi32_i32$1;
  i64toi32_i32$1 = $5_1 + 464 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $373;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66584 | 0) >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66588 | 0) >> 2] | 0;
  $380 = i64toi32_i32$0;
  i64toi32_i32$0 = $5_1 + 456 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $380;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66576 | 0) >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66580 | 0) >> 2] | 0;
  $387 = i64toi32_i32$1;
  i64toi32_i32$1 = $5_1 + 448 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $387;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66568 | 0) >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66572 | 0) >> 2] | 0;
  $394 = i64toi32_i32$0;
  i64toi32_i32$0 = $5_1 + 440 | 0;
  HEAP32[i64toi32_i32$0 >> 2] = $394;
  HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66560 | 0) >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66564 | 0) >> 2] | 0;
  $401 = i64toi32_i32$1;
  i64toi32_i32$1 = $5_1 + 432 | 0;
  HEAP32[i64toi32_i32$1 >> 2] = $401;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66552 | 0) >> 2] | 0;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66556 | 0) >> 2] | 0;
  $405 = i64toi32_i32$0;
  i64toi32_i32$0 = $5_1;
  HEAP32[($5_1 + 424 | 0) >> 2] = $405;
  HEAP32[($5_1 + 428 | 0) >> 2] = i64toi32_i32$1;
  i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 66544 | 0) >> 2] | 0;
  i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 66548 | 0) >> 2] | 0;
  $409 = i64toi32_i32$1;
  i64toi32_i32$1 = $5_1;
  HEAP32[($5_1 + 416 | 0) >> 2] = $409;
  HEAP32[($5_1 + 420 | 0) >> 2] = i64toi32_i32$0;
  $24($5_1 + 304 | 0 | 0, 66608 | 0, 112 | 0) | 0;
  $24($5_1 + 192 | 0 | 0, 66720 | 0, 112 | 0) | 0;
  $24($5_1 | 0, 66832 | 0, 192 | 0) | 0;
  HEAP32[($5_1 + 496 | 0) >> 2] = 0;
  HEAP32[($5_1 + 492 | 0) >> 2] = 31;
  HEAP32[($5_1 + 484 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($5_1 + 496 | 0) >> 2] | 0) >>> 0 < 28 >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($5_1 + 484 | 0) >> 2] = HEAP32[($5_1 + 484 | 0) >> 2] | 0 | (((((HEAPU8[((HEAP32[($5_1 + 508 | 0) >> 2] | 0) + (((((HEAP32[(($5_1 + 304 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) >>> 5 | 0) << 2 | 0) + 3 | 0) - (((HEAP32[(($5_1 + 304 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) & 31 | 0) >>> 3 | 0) | 0) | 0) >> 0] | 0) & 255 | 0) >> (7 - ((HEAP32[(($5_1 + 304 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) & 7 | 0) | 0) | 0) & 1 | 0) << (HEAP32[($5_1 + 492 | 0) >> 2] | 0) | 0) | 0;
    HEAP32[($5_1 + 496 | 0) >> 2] = (HEAP32[($5_1 + 496 | 0) >> 2] | 0) + 1 | 0;
    HEAP32[($5_1 + 492 | 0) >> 2] = (HEAP32[($5_1 + 492 | 0) >> 2] | 0) + -1 | 0;
    continue label$2;
   };
  }
  HEAP32[($5_1 + 496 | 0) >> 2] = 0;
  HEAP32[($5_1 + 492 | 0) >> 2] = 31;
  HEAP32[($5_1 + 480 | 0) >> 2] = 0;
  label$3 : {
   label$4 : while (1) {
    if (!((HEAP32[($5_1 + 496 | 0) >> 2] | 0) >>> 0 < 28 >>> 0 & 1 | 0)) {
     break label$3
    }
    HEAP32[($5_1 + 480 | 0) >> 2] = HEAP32[($5_1 + 480 | 0) >> 2] | 0 | (((((HEAPU8[((HEAP32[($5_1 + 508 | 0) >> 2] | 0) + (((((HEAP32[(($5_1 + 192 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) >>> 5 | 0) << 2 | 0) + 3 | 0) - (((HEAP32[(($5_1 + 192 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) & 31 | 0) >>> 3 | 0) | 0) | 0) >> 0] | 0) & 255 | 0) >> (7 - ((HEAP32[(($5_1 + 192 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) & 7 | 0) | 0) | 0) & 1 | 0) << (HEAP32[($5_1 + 492 | 0) >> 2] | 0) | 0) | 0;
    HEAP32[($5_1 + 496 | 0) >> 2] = (HEAP32[($5_1 + 496 | 0) >> 2] | 0) + 1 | 0;
    HEAP32[($5_1 + 492 | 0) >> 2] = (HEAP32[($5_1 + 492 | 0) >> 2] | 0) + -1 | 0;
    continue label$4;
   };
  }
  HEAP32[($5_1 + 496 | 0) >> 2] = 0;
  label$5 : {
   label$6 : while (1) {
    if (!((HEAP32[($5_1 + 496 | 0) >> 2] | 0) >>> 0 < 16 >>> 0 & 1 | 0)) {
     break label$5
    }
    HEAP32[($5_1 + 484 | 0) >> 2] = ((HEAP32[($5_1 + 484 | 0) >> 2] | 0) << (HEAP32[(($5_1 + 416 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0 | ((HEAP32[($5_1 + 484 | 0) >> 2] | 0) >>> (28 - (HEAP32[(($5_1 + 416 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0) | 0) | 0) & -16 | 0;
    HEAP32[($5_1 + 480 | 0) >> 2] = ((HEAP32[($5_1 + 480 | 0) >> 2] | 0) << (HEAP32[(($5_1 + 416 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0 | ((HEAP32[($5_1 + 480 | 0) >> 2] | 0) >>> (28 - (HEAP32[(($5_1 + 416 | 0) + ((HEAP32[($5_1 + 496 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0) | 0) | 0) & -16 | 0;
    label$7 : {
     label$8 : {
      if (!((HEAP32[($5_1 + 500 | 0) >> 2] | 0 | 0) == (1 | 0) & 1 | 0)) {
       break label$8
      }
      HEAP32[($5_1 + 488 | 0) >> 2] = 15 - (HEAP32[($5_1 + 496 | 0) >> 2] | 0) | 0;
      break label$7;
     }
     HEAP32[($5_1 + 488 | 0) >> 2] = HEAP32[($5_1 + 496 | 0) >> 2] | 0;
    }
    HEAP32[($5_1 + 492 | 0) >> 2] = 0;
    label$9 : {
     label$10 : while (1) {
      if (!((HEAP32[($5_1 + 492 | 0) >> 2] | 0) >>> 0 < 6 >>> 0 & 1 | 0)) {
       break label$9
      }
      HEAP8[(((HEAP32[($5_1 + 504 | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 488 | 0) >> 2] | 0, 6) | 0) + (HEAP32[($5_1 + 492 | 0) >> 2] | 0) | 0) >> 0] = 0;
      HEAP32[($5_1 + 492 | 0) >> 2] = (HEAP32[($5_1 + 492 | 0) >> 2] | 0) + 1 | 0;
      continue label$10;
     };
    }
    HEAP32[($5_1 + 492 | 0) >> 2] = 0;
    label$11 : {
     label$12 : while (1) {
      if (!((HEAP32[($5_1 + 492 | 0) >> 2] | 0) >>> 0 < 24 >>> 0 & 1 | 0)) {
       break label$11
      }
      $285 = ((HEAP32[($5_1 + 504 | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 488 | 0) >> 2] | 0, 6) | 0) + ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) >>> 3 | 0) | 0;
      HEAP8[$285 >> 0] = (HEAPU8[$285 >> 0] | 0) & 255 | 0 | ((((HEAP32[($5_1 + 484 | 0) >> 2] | 0) >>> (31 - (HEAP32[($5_1 + ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) | 0) | 0) & 1 | 0) << (7 - ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) & 7 | 0) | 0) | 0) | 0;
      HEAP32[($5_1 + 492 | 0) >> 2] = (HEAP32[($5_1 + 492 | 0) >> 2] | 0) + 1 | 0;
      continue label$12;
     };
    }
    label$13 : {
     label$14 : while (1) {
      if (!((HEAP32[($5_1 + 492 | 0) >> 2] | 0) >>> 0 < 48 >>> 0 & 1 | 0)) {
       break label$13
      }
      $328 = ((HEAP32[($5_1 + 504 | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 488 | 0) >> 2] | 0, 6) | 0) + ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) >>> 3 | 0) | 0;
      HEAP8[$328 >> 0] = (HEAPU8[$328 >> 0] | 0) & 255 | 0 | ((((HEAP32[($5_1 + 480 | 0) >> 2] | 0) >>> (31 - ((HEAP32[($5_1 + ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) << 2 | 0) | 0) >> 2] | 0) - 27 | 0) | 0) | 0) & 1 | 0) << (7 - ((HEAP32[($5_1 + 492 | 0) >> 2] | 0) & 7 | 0) | 0) | 0) | 0;
      HEAP32[($5_1 + 492 | 0) >> 2] = (HEAP32[($5_1 + 492 | 0) >> 2] | 0) + 1 | 0;
      continue label$14;
     };
    }
    HEAP32[($5_1 + 496 | 0) >> 2] = (HEAP32[($5_1 + 496 | 0) >> 2] | 0) + 1 | 0;
    continue label$6;
   };
  }
  global$0 = $5_1 + 512 | 0;
  return;
 }
 
 function $8($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 32 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 28 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 24 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 20 | 0) >> 2] = $2_1;
  $4($5_1 + 12 | 0 | 0, HEAP32[($5_1 + 28 | 0) >> 2] | 0 | 0);
  HEAP32[($5_1 + 8 | 0) >> 2] = 0;
  label$1 : {
   label$2 : while (1) {
    if (!((HEAP32[($5_1 + 8 | 0) >> 2] | 0) >>> 0 < 15 >>> 0 & 1 | 0)) {
     break label$1
    }
    HEAP32[($5_1 + 4 | 0) >> 2] = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
    HEAP32[($5_1 + 16 | 0) >> 2] = ($6(HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 20 | 0) >> 2] | 0) + Math_imul(HEAP32[($5_1 + 8 | 0) >> 2] | 0, 6) | 0 | 0) | 0) ^ (HEAP32[($5_1 + 12 | 0) >> 2] | 0) | 0;
    HEAP32[($5_1 + 12 | 0) >> 2] = HEAP32[($5_1 + 4 | 0) >> 2] | 0;
    HEAP32[($5_1 + 8 | 0) >> 2] = (HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 1 | 0;
    continue label$2;
   };
  }
  HEAP32[($5_1 + 12 | 0) >> 2] = ($6(HEAP32[($5_1 + 16 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 20 | 0) >> 2] | 0) + 90 | 0 | 0) | 0) ^ (HEAP32[($5_1 + 12 | 0) >> 2] | 0) | 0;
  $5($5_1 + 12 | 0 | 0, HEAP32[($5_1 + 24 | 0) >> 2] | 0 | 0);
  global$0 = $5_1 + 32 | 0;
  return;
 }
 
 function $9($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 16 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 4 | 0) >> 2] = $2_1;
  label$1 : {
   label$2 : {
    if (HEAP32[($5_1 + 4 | 0) >> 2] | 0) {
     break label$2
    }
    $7(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
    $7((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 8 | 0 | 0, (HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 96 | 0 | 0, ((HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0 | 0);
    $7((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 16 | 0 | 0, (HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 192 | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
    break label$1;
   }
   $7((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 16 | 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
   $7((HEAP32[($5_1 + 12 | 0) >> 2] | 0) + 8 | 0 | 0, (HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 96 | 0 | 0, ((HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0) != (0 | 0) ^ -1 | 0) & 1 | 0 | 0);
   $7(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 8 | 0) >> 2] | 0) + 192 | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
  }
  global$0 = $5_1 + 16 | 0;
  return;
 }
 
 function $10($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $5_1 = 0;
  $5_1 = global$0 - 16 | 0;
  global$0 = $5_1;
  HEAP32[($5_1 + 12 | 0) >> 2] = $0_1;
  HEAP32[($5_1 + 8 | 0) >> 2] = $1_1;
  HEAP32[($5_1 + 4 | 0) >> 2] = $2_1;
  $8(HEAP32[($5_1 + 12 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 0);
  $8(HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 4 | 0) >> 2] | 0) + 96 | 0 | 0);
  $8(HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, HEAP32[($5_1 + 8 | 0) >> 2] | 0 | 0, (HEAP32[($5_1 + 4 | 0) >> 2] | 0) + 192 | 0 | 0);
  global$0 = $5_1 + 16 | 0;
  return;
 }
 
 function $11($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $3_1 = 0, $6_1 = 0, $7_1 = 0, $8_1 = 0, $9_1 = 0, $10_1 = 0, $5_1 = 0, $11_1 = 0;
  label$1 : {
   if ($1_1) {
    break label$1
   }
   return 0 | 0;
  }
  $0_1 = $0_1 ^ -1 | 0;
  label$2 : {
   if ($2_1 >>> 0 < 23 >>> 0) {
    break label$2
   }
   label$3 : {
    if (!($1_1 & 3 | 0)) {
     break label$3
    }
    $0_1 = (HEAP32[(((((HEAPU8[$1_1 >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
    $3_1 = $1_1 + 1 | 0;
    label$4 : {
     $4_1 = $2_1 + -1 | 0;
     if (!$4_1) {
      break label$4
     }
     if (!($3_1 & 3 | 0)) {
      break label$4
     }
     $0_1 = (HEAP32[(((((HEAPU8[($1_1 + 1 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
     $3_1 = $1_1 + 2 | 0;
     label$5 : {
      $4_1 = $2_1 + -2 | 0;
      if (!$4_1) {
       break label$5
      }
      if (!($3_1 & 3 | 0)) {
       break label$5
      }
      $0_1 = (HEAP32[(((((HEAPU8[($1_1 + 2 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
      $3_1 = $1_1 + 3 | 0;
      label$6 : {
       $4_1 = $2_1 + -3 | 0;
       if (!$4_1) {
        break label$6
       }
       if (!($3_1 & 3 | 0)) {
        break label$6
       }
       $0_1 = (HEAP32[(((((HEAPU8[($1_1 + 3 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
       $1_1 = $1_1 + 4 | 0;
       $2_1 = $2_1 + -4 | 0;
       break label$3;
      }
      $2_1 = $4_1;
      $1_1 = $3_1;
      break label$3;
     }
     $2_1 = $4_1;
     $1_1 = $3_1;
     break label$3;
    }
    $2_1 = $4_1;
    $1_1 = $3_1;
   }
   $3_1 = ($2_1 >>> 0) / (20 >>> 0) | 0;
   $5_1 = Math_imul($3_1, -20);
   label$7 : {
    label$8 : {
     $6_1 = $3_1 + -1 | 0;
     if ($6_1) {
      break label$8
     }
     $7_1 = 0;
     $8_1 = 0;
     $9_1 = 0;
     $10_1 = 0;
     break label$7;
    }
    $11_1 = Math_imul($3_1, 20) + -20 | 0;
    $10_1 = 0;
    $3_1 = $1_1;
    $9_1 = 0;
    $8_1 = 0;
    $7_1 = 0;
    label$9 : while (1) {
     $4_1 = (HEAP32[($3_1 + 16 | 0) >> 2] | 0) ^ $10_1 | 0;
     $10_1 = (HEAP32[((($4_1 >>> 22 | 0) & 1020 | 0) + 71120 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 14 | 0) & 1020 | 0) + 70096 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 6 | 0) & 1020 | 0) + 69072 | 0) >> 2] | 0) ^ (HEAP32[((($4_1 & 255 | 0) << 2 | 0) + 68048 | 0) >> 2] | 0) | 0) | 0) | 0;
     $4_1 = (HEAP32[($3_1 + 12 | 0) >> 2] | 0) ^ $9_1 | 0;
     $9_1 = (HEAP32[((($4_1 >>> 22 | 0) & 1020 | 0) + 71120 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 14 | 0) & 1020 | 0) + 70096 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 6 | 0) & 1020 | 0) + 69072 | 0) >> 2] | 0) ^ (HEAP32[((($4_1 & 255 | 0) << 2 | 0) + 68048 | 0) >> 2] | 0) | 0) | 0) | 0;
     $4_1 = (HEAP32[($3_1 + 8 | 0) >> 2] | 0) ^ $7_1 | 0;
     $7_1 = (HEAP32[((($4_1 >>> 22 | 0) & 1020 | 0) + 71120 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 14 | 0) & 1020 | 0) + 70096 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 6 | 0) & 1020 | 0) + 69072 | 0) >> 2] | 0) ^ (HEAP32[((($4_1 & 255 | 0) << 2 | 0) + 68048 | 0) >> 2] | 0) | 0) | 0) | 0;
     $4_1 = (HEAP32[($3_1 + 4 | 0) >> 2] | 0) ^ $8_1 | 0;
     $8_1 = (HEAP32[((($4_1 >>> 22 | 0) & 1020 | 0) + 71120 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 14 | 0) & 1020 | 0) + 70096 | 0) >> 2] | 0) ^ ((HEAP32[((($4_1 >>> 6 | 0) & 1020 | 0) + 69072 | 0) >> 2] | 0) ^ (HEAP32[((($4_1 & 255 | 0) << 2 | 0) + 68048 | 0) >> 2] | 0) | 0) | 0) | 0;
     $0_1 = (HEAP32[$3_1 >> 2] | 0) ^ $0_1 | 0;
     $0_1 = (HEAP32[((($0_1 >>> 22 | 0) & 1020 | 0) + 71120 | 0) >> 2] | 0) ^ ((HEAP32[((($0_1 >>> 14 | 0) & 1020 | 0) + 70096 | 0) >> 2] | 0) ^ ((HEAP32[((($0_1 >>> 6 | 0) & 1020 | 0) + 69072 | 0) >> 2] | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 68048 | 0) >> 2] | 0) | 0) | 0) | 0;
     $3_1 = $3_1 + 20 | 0;
     $6_1 = $6_1 + -1 | 0;
     if ($6_1) {
      continue label$9
     }
     break label$9;
    };
    $1_1 = $1_1 + $11_1 | 0;
   }
   $2_1 = $5_1 + $2_1 | 0;
   $0_1 = (HEAP32[$1_1 >> 2] | 0) ^ $0_1 | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = (((HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ $8_1 | 0) ^ (HEAP32[($1_1 + 4 | 0) >> 2] | 0) | 0) ^ ($0_1 >>> 8 | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = (((HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ $7_1 | 0) ^ (HEAP32[($1_1 + 8 | 0) >> 2] | 0) | 0) ^ ($0_1 >>> 8 | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = (((HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ $9_1 | 0) ^ (HEAP32[($1_1 + 12 | 0) >> 2] | 0) | 0) ^ ($0_1 >>> 8 | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = (((HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ $10_1 | 0) ^ (HEAP32[($1_1 + 16 | 0) >> 2] | 0) | 0) ^ ($0_1 >>> 8 | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[((($0_1 & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
   $1_1 = $1_1 + 20 | 0;
  }
  label$10 : {
   if ($2_1 >>> 0 <= 7 >>> 0) {
    break label$10
   }
   label$11 : while (1) {
    $0_1 = (HEAP32[(((((HEAPU8[$1_1 >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 1 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 2 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 3 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 4 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 5 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 6 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $0_1 = ($0_1 >>> 8 | 0) ^ (HEAP32[(((((HEAPU8[($1_1 + 7 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) | 0;
    $1_1 = $1_1 + 8 | 0;
    $2_1 = $2_1 + -8 | 0;
    if ($2_1 >>> 0 > 7 >>> 0) {
     continue label$11
    }
    break label$11;
   };
  }
  label$12 : {
   if (!$2_1) {
    break label$12
   }
   label$13 : {
    label$14 : {
     if ($2_1 & 1 | 0) {
      break label$14
     }
     $3_1 = $2_1;
     break label$13;
    }
    $0_1 = (HEAP32[(((((HEAPU8[$1_1 >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
    $1_1 = $1_1 + 1 | 0;
    $3_1 = $2_1 + -1 | 0;
   }
   if (($2_1 | 0) == (1 | 0)) {
    break label$12
   }
   label$15 : while (1) {
    $0_1 = (HEAP32[(((((HEAPU8[$1_1 >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
    $0_1 = (HEAP32[(((((HEAPU8[($1_1 + 1 | 0) >> 0] | 0) ^ $0_1 | 0) & 255 | 0) << 2 | 0) + 67024 | 0) >> 2] | 0) ^ ($0_1 >>> 8 | 0) | 0;
    $1_1 = $1_1 + 2 | 0;
    $3_1 = $3_1 + -2 | 0;
    if ($3_1) {
     continue label$15
    }
    break label$15;
   };
  }
  return $0_1 ^ -1 | 0 | 0;
 }
 
 function $12($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $11($0_1 | 0, $1_1 | 0, $2_1 | 0) | 0 | 0;
 }
 
 function $13($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $5_1 = 0, $7_1 = 0, $6_1 = 0, $52 = 0, $58 = 0, $64 = 0, $70 = 0, $76 = 0, $82 = 0, $88 = 0, $94 = 0, $100 = 0, $106 = 0, $112 = 0, $118 = 0, $124 = 0, $130 = 0, $136 = 0, $166 = 0, $172 = 0, $178 = 0, $184 = 0, $190 = 0, $196 = 0, $202 = 0, $208 = 0, $214 = 0, $220 = 0, $226 = 0, $232 = 0, $238 = 0, $244 = 0;
  $3_1 = $0_1 & 65535 | 0;
  $4_1 = $0_1 >>> 16 | 0;
  $0_1 = 1;
  label$1 : {
   if (($2_1 | 0) != (1 | 0)) {
    break label$1
   }
   $0_1 = $3_1 + (HEAPU8[$1_1 >> 0] | 0) | 0;
   $0_1 = $0_1 >>> 0 > 65520 >>> 0 ? $0_1 + -65521 | 0 : $0_1;
   $3_1 = $0_1 + $4_1 | 0;
   $4_1 = $3_1 << 16 | 0;
   return ($3_1 >>> 0 > 65520 >>> 0 ? $4_1 + 983040 | 0 : $4_1) | $0_1 | 0 | 0;
  }
  label$2 : {
   if (!$1_1) {
    break label$2
   }
   label$3 : {
    if ($2_1 >>> 0 < 16 >>> 0) {
     break label$3
    }
    label$4 : {
     label$5 : {
      label$6 : {
       label$7 : {
        if ($2_1 >>> 0 <= 5551 >>> 0) {
         break label$7
        }
        label$8 : while (1) {
         $2_1 = $2_1 + -5552 | 0;
         $5_1 = 347;
         $0_1 = $1_1;
         label$9 : while (1) {
          $3_1 = $3_1 + (HEAPU8[$0_1 >> 0] | 0) | 0;
          $52 = $3_1 + $4_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 1 | 0) >> 0] | 0) | 0;
          $58 = $52 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 2 | 0) >> 0] | 0) | 0;
          $64 = $58 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 3 | 0) >> 0] | 0) | 0;
          $70 = $64 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 4 | 0) >> 0] | 0) | 0;
          $76 = $70 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 5 | 0) >> 0] | 0) | 0;
          $82 = $76 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 6 | 0) >> 0] | 0) | 0;
          $88 = $82 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 7 | 0) >> 0] | 0) | 0;
          $94 = $88 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 8 | 0) >> 0] | 0) | 0;
          $100 = $94 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 9 | 0) >> 0] | 0) | 0;
          $106 = $100 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 10 | 0) >> 0] | 0) | 0;
          $112 = $106 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 11 | 0) >> 0] | 0) | 0;
          $118 = $112 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 12 | 0) >> 0] | 0) | 0;
          $124 = $118 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 13 | 0) >> 0] | 0) | 0;
          $130 = $124 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 14 | 0) >> 0] | 0) | 0;
          $136 = $130 + $3_1 | 0;
          $3_1 = $3_1 + (HEAPU8[($0_1 + 15 | 0) >> 0] | 0) | 0;
          $4_1 = $136 + $3_1 | 0;
          $0_1 = $0_1 + 16 | 0;
          $5_1 = $5_1 + -1 | 0;
          if ($5_1) {
           continue label$9
          }
          break label$9;
         };
         $4_1 = ($4_1 >>> 0) % (65521 >>> 0) | 0;
         $3_1 = ($3_1 >>> 0) % (65521 >>> 0) | 0;
         $1_1 = $1_1 + 5552 | 0;
         if ($2_1 >>> 0 > 5551 >>> 0) {
          continue label$8
         }
         break label$8;
        };
        if (!$2_1) {
         break label$4
        }
        if ($2_1 >>> 0 < 16 >>> 0) {
         break label$6
        }
       }
       label$10 : while (1) {
        $0_1 = $3_1 + (HEAPU8[$1_1 >> 0] | 0) | 0;
        $166 = $0_1 + $4_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 1 | 0) >> 0] | 0) | 0;
        $172 = $166 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 2 | 0) >> 0] | 0) | 0;
        $178 = $172 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 3 | 0) >> 0] | 0) | 0;
        $184 = $178 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 4 | 0) >> 0] | 0) | 0;
        $190 = $184 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 5 | 0) >> 0] | 0) | 0;
        $196 = $190 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 6 | 0) >> 0] | 0) | 0;
        $202 = $196 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 7 | 0) >> 0] | 0) | 0;
        $208 = $202 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 8 | 0) >> 0] | 0) | 0;
        $214 = $208 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 9 | 0) >> 0] | 0) | 0;
        $220 = $214 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 10 | 0) >> 0] | 0) | 0;
        $226 = $220 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 11 | 0) >> 0] | 0) | 0;
        $232 = $226 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 12 | 0) >> 0] | 0) | 0;
        $238 = $232 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 13 | 0) >> 0] | 0) | 0;
        $244 = $238 + $0_1 | 0;
        $0_1 = $0_1 + (HEAPU8[($1_1 + 14 | 0) >> 0] | 0) | 0;
        $3_1 = $0_1 + (HEAPU8[($1_1 + 15 | 0) >> 0] | 0) | 0;
        $4_1 = ($244 + $0_1 | 0) + $3_1 | 0;
        $1_1 = $1_1 + 16 | 0;
        $2_1 = $2_1 + -16 | 0;
        if ($2_1 >>> 0 > 15 >>> 0) {
         continue label$10
        }
        break label$10;
       };
       if (!$2_1) {
        break label$5
       }
      }
      $6_1 = $2_1 + -1 | 0;
      label$11 : {
       $7_1 = $2_1 & 3 | 0;
       if (!$7_1) {
        break label$11
       }
       $5_1 = 0;
       $0_1 = $1_1;
       label$12 : while (1) {
        $2_1 = $2_1 + -1 | 0;
        $3_1 = $3_1 + (HEAPU8[$0_1 >> 0] | 0) | 0;
        $4_1 = $3_1 + $4_1 | 0;
        $1_1 = $0_1 + 1 | 0;
        $0_1 = $1_1;
        $5_1 = $5_1 + 1 | 0;
        if (($5_1 | 0) != ($7_1 | 0)) {
         continue label$12
        }
        break label$12;
       };
      }
      if ($6_1 >>> 0 < 3 >>> 0) {
       break label$5
      }
      label$13 : while (1) {
       $0_1 = $3_1 + (HEAPU8[$1_1 >> 0] | 0) | 0;
       $5_1 = $0_1 + (HEAPU8[($1_1 + 1 | 0) >> 0] | 0) | 0;
       $7_1 = $5_1 + (HEAPU8[($1_1 + 2 | 0) >> 0] | 0) | 0;
       $3_1 = $7_1 + (HEAPU8[($1_1 + 3 | 0) >> 0] | 0) | 0;
       $4_1 = $3_1 + ($7_1 + ($5_1 + ($0_1 + $4_1 | 0) | 0) | 0) | 0;
       $1_1 = $1_1 + 4 | 0;
       $2_1 = $2_1 + -4 | 0;
       if ($2_1) {
        continue label$13
       }
       break label$13;
      };
     }
     $4_1 = ($4_1 >>> 0) % (65521 >>> 0) | 0;
     $3_1 = ($3_1 >>> 0) % (65521 >>> 0) | 0;
    }
    return $4_1 << 16 | 0 | $3_1 | 0 | 0;
   }
   label$14 : {
    if (!$2_1) {
     break label$14
    }
    label$15 : {
     label$16 : {
      $6_1 = $2_1 & 3 | 0;
      if ($6_1) {
       break label$16
      }
      $0_1 = $2_1;
      break label$15;
     }
     $7_1 = 0;
     $0_1 = $2_1;
     $5_1 = $1_1;
     label$17 : while (1) {
      $0_1 = $0_1 + -1 | 0;
      $3_1 = $3_1 + (HEAPU8[$5_1 >> 0] | 0) | 0;
      $4_1 = $3_1 + $4_1 | 0;
      $1_1 = $5_1 + 1 | 0;
      $5_1 = $1_1;
      $7_1 = $7_1 + 1 | 0;
      if (($7_1 | 0) != ($6_1 | 0)) {
       continue label$17
      }
      break label$17;
     };
    }
    if ($2_1 >>> 0 < 4 >>> 0) {
     break label$14
    }
    label$18 : while (1) {
     $5_1 = $3_1 + (HEAPU8[$1_1 >> 0] | 0) | 0;
     $2_1 = $5_1 + (HEAPU8[($1_1 + 1 | 0) >> 0] | 0) | 0;
     $7_1 = $2_1 + (HEAPU8[($1_1 + 2 | 0) >> 0] | 0) | 0;
     $3_1 = $7_1 + (HEAPU8[($1_1 + 3 | 0) >> 0] | 0) | 0;
     $4_1 = $3_1 + ($7_1 + ($2_1 + ($5_1 + $4_1 | 0) | 0) | 0) | 0;
     $1_1 = $1_1 + 4 | 0;
     $0_1 = $0_1 + -4 | 0;
     if ($0_1) {
      continue label$18
     }
     break label$18;
    };
   }
   $0_1 = (($4_1 >>> 0) % (65521 >>> 0) | 0) << 16 | 0 | ($3_1 >>> 0 > 65520 >>> 0 ? $3_1 + -65521 | 0 : $3_1) | 0;
  }
  return $0_1 | 0;
 }
 
 function $14($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $13($0_1 | 0, $1_1 | 0, $2_1 | 0) | 0 | 0;
 }
 
 function $15($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0, $3_1 = 0, $22_1 = 0, $23_1 = 0, $4_1 = 0, $24_1 = 0, $27_1 = 0, $14_1 = 0, $6_1 = 0, $25_1 = 0, $7_1 = 0, $28_1 = 0, $20_1 = 0, $26_1 = 0, $5_1 = 0, $9_1 = 0, $10_1 = 0, $12_1 = 0, $15_1 = 0, $18_1 = 0, $19_1 = 0, $8_1 = 0, $11_1 = 0, $13_1 = 0, $16_1 = 0, $17_1 = 0, $21_1 = 0;
  $2_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
  $3_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
  $4_1 = $2_1 + $3_1 | 0;
  $5_1 = $4_1 + ($1_1 ^ -1 | 0) | 0;
  $6_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
  $7_1 = HEAP32[($6_1 + 52 | 0) >> 2] | 0;
  $8_1 = ($4_1 + ($7_1 ^ -1 | 0) | 0) - $1_1 | 0;
  $9_1 = $7_1 & 7 | 0;
  $10_1 = HEAP32[($6_1 + 44 | 0) >> 2] | 0;
  $11_1 = $7_1 + $10_1 | 0;
  $12_1 = $4_1 + -257 | 0;
  $13_1 = $3_1 + ($2_1 - $1_1 | 0) | 0;
  $14_1 = HEAP32[$0_1 >> 2] | 0;
  $15_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) + $14_1 | 0) + -5 | 0;
  $16_1 = (-1 << (HEAP32[($6_1 + 92 | 0) >> 2] | 0) | 0) ^ -1 | 0;
  $17_1 = (-1 << (HEAP32[($6_1 + 88 | 0) >> 2] | 0) | 0) ^ -1 | 0;
  $18_1 = HEAP32[($6_1 + 84 | 0) >> 2] | 0;
  $19_1 = HEAP32[($6_1 + 80 | 0) >> 2] | 0;
  $4_1 = HEAP32[($6_1 + 64 | 0) >> 2] | 0;
  $1_1 = HEAP32[($6_1 + 60 | 0) >> 2] | 0;
  $20_1 = HEAP32[($6_1 + 56 | 0) >> 2] | 0;
  $21_1 = HEAP32[($6_1 + 48 | 0) >> 2] | 0;
  label$1 : {
   label$2 : {
    label$3 : while (1) {
     label$4 : {
      if ($4_1 >>> 0 > 14 >>> 0) {
       break label$4
      }
      $1_1 = (((HEAPU8[$14_1 >> 0] | 0) << $4_1 | 0) + $1_1 | 0) + ((HEAPU8[($14_1 + 1 | 0) >> 0] | 0) << ($4_1 + 8 | 0) | 0) | 0;
      $4_1 = $4_1 + 16 | 0;
      $14_1 = $14_1 + 2 | 0;
     }
     $2_1 = $19_1 + (($1_1 & $17_1 | 0) << 2 | 0) | 0;
     $22_1 = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
     $4_1 = $4_1 - $22_1 | 0;
     $1_1 = $1_1 >>> $22_1 | 0;
     label$5 : {
      label$6 : {
       label$7 : {
        label$8 : while (1) {
         label$9 : {
          $22_1 = HEAPU8[$2_1 >> 0] | 0;
          if ($22_1) {
           break label$9
          }
          HEAP8[$3_1 >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
          $3_1 = $3_1 + 1 | 0;
          break label$6;
         }
         $23_1 = $22_1 & 255 | 0;
         label$10 : {
          if (!($22_1 & 16 | 0)) {
           break label$10
          }
          $24_1 = HEAPU16[($2_1 + 2 | 0) >> 1] | 0;
          label$11 : {
           label$12 : {
            $2_1 = $23_1 & 15 | 0;
            if ($2_1) {
             break label$12
            }
            $22_1 = $1_1;
            $23_1 = $14_1;
            break label$11;
           }
           label$13 : {
            label$14 : {
             if ($4_1 >>> 0 < $2_1 >>> 0) {
              break label$14
             }
             $22_1 = $4_1;
             $23_1 = $14_1;
             break label$13;
            }
            $22_1 = $4_1 + 8 | 0;
            $23_1 = $14_1 + 1 | 0;
            $1_1 = ((HEAPU8[$14_1 >> 0] | 0) << $4_1 | 0) + $1_1 | 0;
           }
           $4_1 = $22_1 - $2_1 | 0;
           $22_1 = $1_1 >>> $2_1 | 0;
           $24_1 = ($1_1 & ((-1 << $2_1 | 0) ^ -1 | 0) | 0) + $24_1 | 0;
          }
          label$15 : {
           if ($4_1 >>> 0 > 14 >>> 0) {
            break label$15
           }
           $22_1 = (((HEAPU8[$23_1 >> 0] | 0) << $4_1 | 0) + $22_1 | 0) + ((HEAPU8[($23_1 + 1 | 0) >> 0] | 0) << ($4_1 + 8 | 0) | 0) | 0;
           $4_1 = $4_1 + 16 | 0;
           $23_1 = $23_1 + 2 | 0;
          }
          $2_1 = $18_1 + (($22_1 & $16_1 | 0) << 2 | 0) | 0;
          $1_1 = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
          $4_1 = $4_1 - $1_1 | 0;
          $1_1 = $22_1 >>> $1_1 | 0;
          $22_1 = HEAPU8[$2_1 >> 0] | 0;
          if ($22_1 & 16 | 0) {
           break label$7
          }
          label$16 : {
           label$17 : while (1) {
            if ($22_1 & 64 | 0) {
             break label$16
            }
            $2_1 = ($18_1 + ((HEAPU16[($2_1 + 2 | 0) >> 1] | 0) << 2 | 0) | 0) + (($1_1 & ((-1 << $22_1 | 0) ^ -1 | 0) | 0) << 2 | 0) | 0;
            $22_1 = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
            $4_1 = $4_1 - $22_1 | 0;
            $1_1 = $1_1 >>> $22_1 | 0;
            $22_1 = HEAPU8[$2_1 >> 0] | 0;
            if ($22_1 & 16 | 0) {
             break label$7
            }
            continue label$17;
           };
          }
          $22_1 = 65972;
          $14_1 = $23_1;
          break label$5;
         }
         label$18 : {
          if ($23_1 & 64 | 0) {
           break label$18
          }
          $2_1 = ($19_1 + ((HEAPU16[($2_1 + 2 | 0) >> 1] | 0) << 2 | 0) | 0) + (($1_1 & ((-1 << $23_1 | 0) ^ -1 | 0) | 0) << 2 | 0) | 0;
          $22_1 = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
          $4_1 = $4_1 - $22_1 | 0;
          $1_1 = $1_1 >>> $22_1 | 0;
          continue label$8;
         }
         break label$8;
        };
        $2_1 = 16191;
        $22_1 = 65944;
        if ($23_1 & 32 | 0) {
         break label$2
        }
        break label$5;
       }
       $25_1 = HEAPU16[($2_1 + 2 | 0) >> 1] | 0;
       label$19 : {
        label$20 : {
         $2_1 = $22_1 & 15 | 0;
         if ($4_1 >>> 0 < $2_1 >>> 0) {
          break label$20
         }
         $22_1 = $4_1;
         $14_1 = $23_1;
         break label$19;
        }
        $1_1 = ((HEAPU8[$23_1 >> 0] | 0) << $4_1 | 0) + $1_1 | 0;
        label$21 : {
         $22_1 = $4_1 + 8 | 0;
         if ($22_1 >>> 0 < $2_1 >>> 0) {
          break label$21
         }
         $14_1 = $23_1 + 1 | 0;
         break label$19;
        }
        $14_1 = $23_1 + 2 | 0;
        $1_1 = ((HEAPU8[($23_1 + 1 | 0) >> 0] | 0) << $22_1 | 0) + $1_1 | 0;
        $22_1 = $4_1 + 16 | 0;
       }
       $23_1 = $1_1 & ((-1 << $2_1 | 0) ^ -1 | 0) | 0;
       $4_1 = $22_1 - $2_1 | 0;
       $1_1 = $1_1 >>> $2_1 | 0;
       label$22 : {
        label$23 : {
         $26_1 = $23_1 + $25_1 | 0;
         $2_1 = $3_1 - $13_1 | 0;
         if ($26_1 >>> 0 <= $2_1 >>> 0) {
          break label$23
         }
         label$24 : {
          $27_1 = $26_1 - $2_1 | 0;
          if ($27_1 >>> 0 <= $21_1 >>> 0) {
           break label$24
          }
          if (!(HEAP32[($6_1 + 7108 | 0) >> 2] | 0)) {
           break label$24
          }
          $22_1 = 65855;
          break label$5;
         }
         label$25 : {
          label$26 : {
           label$27 : {
            if ($7_1) {
             break label$27
            }
            $2_1 = $20_1 + ($10_1 - $27_1 | 0) | 0;
            if ($24_1 >>> 0 <= $27_1 >>> 0) {
             break label$25
            }
            $28_1 = (($5_1 + $23_1 | 0) + $25_1 | 0) - $3_1 | 0;
            $23_1 = 0;
            $22_1 = $27_1;
            label$28 : {
             $25_1 = $22_1 & 7 | 0;
             if (!$25_1) {
              break label$28
             }
             label$29 : while (1) {
              HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
              $22_1 = $22_1 + -1 | 0;
              $3_1 = $3_1 + 1 | 0;
              $2_1 = $2_1 + 1 | 0;
              $23_1 = $23_1 + 1 | 0;
              if (($23_1 | 0) != ($25_1 | 0)) {
               continue label$29
              }
              break label$29;
             };
            }
            if ($28_1 >>> 0 < 7 >>> 0) {
             break label$26
            }
            label$30 : while (1) {
             HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
             HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
             HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
             HEAP8[($3_1 + 3 | 0) >> 0] = HEAPU8[($2_1 + 3 | 0) >> 0] | 0;
             HEAP8[($3_1 + 4 | 0) >> 0] = HEAPU8[($2_1 + 4 | 0) >> 0] | 0;
             HEAP8[($3_1 + 5 | 0) >> 0] = HEAPU8[($2_1 + 5 | 0) >> 0] | 0;
             HEAP8[($3_1 + 6 | 0) >> 0] = HEAPU8[($2_1 + 6 | 0) >> 0] | 0;
             HEAP8[($3_1 + 7 | 0) >> 0] = HEAPU8[($2_1 + 7 | 0) >> 0] | 0;
             $3_1 = $3_1 + 8 | 0;
             $2_1 = $2_1 + 8 | 0;
             $22_1 = $22_1 + -8 | 0;
             if ($22_1) {
              continue label$30
             }
             break label$26;
            };
           }
           label$31 : {
            if ($7_1 >>> 0 >= $27_1 >>> 0) {
             break label$31
            }
            $2_1 = $20_1 + ($11_1 - $27_1 | 0) | 0;
            $28_1 = $27_1 - $7_1 | 0;
            if ($24_1 >>> 0 <= $28_1 >>> 0) {
             break label$25
            }
            $25_1 = (($8_1 + $23_1 | 0) + $25_1 | 0) - $3_1 | 0;
            $23_1 = 0;
            $22_1 = $28_1;
            label$32 : {
             $27_1 = $22_1 & 7 | 0;
             if (!$27_1) {
              break label$32
             }
             label$33 : while (1) {
              HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
              $22_1 = $22_1 + -1 | 0;
              $3_1 = $3_1 + 1 | 0;
              $2_1 = $2_1 + 1 | 0;
              $23_1 = $23_1 + 1 | 0;
              if (($23_1 | 0) != ($27_1 | 0)) {
               continue label$33
              }
              break label$33;
             };
            }
            label$34 : {
             if ($25_1 >>> 0 < 7 >>> 0) {
              break label$34
             }
             label$35 : while (1) {
              HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
              HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
              HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
              HEAP8[($3_1 + 3 | 0) >> 0] = HEAPU8[($2_1 + 3 | 0) >> 0] | 0;
              HEAP8[($3_1 + 4 | 0) >> 0] = HEAPU8[($2_1 + 4 | 0) >> 0] | 0;
              HEAP8[($3_1 + 5 | 0) >> 0] = HEAPU8[($2_1 + 5 | 0) >> 0] | 0;
              HEAP8[($3_1 + 6 | 0) >> 0] = HEAPU8[($2_1 + 6 | 0) >> 0] | 0;
              HEAP8[($3_1 + 7 | 0) >> 0] = HEAPU8[($2_1 + 7 | 0) >> 0] | 0;
              $3_1 = $3_1 + 8 | 0;
              $2_1 = $2_1 + 8 | 0;
              $22_1 = $22_1 + -8 | 0;
              if ($22_1) {
               continue label$35
              }
              break label$35;
             };
            }
            label$36 : {
             $24_1 = $24_1 - $28_1 | 0;
             if ($24_1 >>> 0 > $7_1 >>> 0) {
              break label$36
             }
             $2_1 = $20_1;
             break label$25;
            }
            $23_1 = 0;
            $22_1 = $7_1;
            $2_1 = $20_1;
            label$37 : {
             if (!$9_1) {
              break label$37
             }
             label$38 : while (1) {
              HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
              $22_1 = $22_1 + -1 | 0;
              $3_1 = $3_1 + 1 | 0;
              $2_1 = $2_1 + 1 | 0;
              $23_1 = $23_1 + 1 | 0;
              if (($23_1 | 0) != ($9_1 | 0)) {
               continue label$38
              }
              break label$38;
             };
            }
            label$39 : {
             if ($7_1 >>> 0 < 8 >>> 0) {
              break label$39
             }
             label$40 : while (1) {
              HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
              HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
              HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
              HEAP8[($3_1 + 3 | 0) >> 0] = HEAPU8[($2_1 + 3 | 0) >> 0] | 0;
              HEAP8[($3_1 + 4 | 0) >> 0] = HEAPU8[($2_1 + 4 | 0) >> 0] | 0;
              HEAP8[($3_1 + 5 | 0) >> 0] = HEAPU8[($2_1 + 5 | 0) >> 0] | 0;
              HEAP8[($3_1 + 6 | 0) >> 0] = HEAPU8[($2_1 + 6 | 0) >> 0] | 0;
              HEAP8[($3_1 + 7 | 0) >> 0] = HEAPU8[($2_1 + 7 | 0) >> 0] | 0;
              $3_1 = $3_1 + 8 | 0;
              $2_1 = $2_1 + 8 | 0;
              $22_1 = $22_1 + -8 | 0;
              if ($22_1) {
               continue label$40
              }
              break label$40;
             };
            }
            $2_1 = $3_1 - $26_1 | 0;
            $24_1 = $24_1 - $7_1 | 0;
            break label$25;
           }
           $2_1 = $20_1 + ($7_1 - $27_1 | 0) | 0;
           if ($24_1 >>> 0 <= $27_1 >>> 0) {
            break label$25
           }
           $28_1 = (($5_1 + $23_1 | 0) + $25_1 | 0) - $3_1 | 0;
           $23_1 = 0;
           $22_1 = $27_1;
           label$41 : {
            $25_1 = $22_1 & 7 | 0;
            if (!$25_1) {
             break label$41
            }
            label$42 : while (1) {
             HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
             $22_1 = $22_1 + -1 | 0;
             $3_1 = $3_1 + 1 | 0;
             $2_1 = $2_1 + 1 | 0;
             $23_1 = $23_1 + 1 | 0;
             if (($23_1 | 0) != ($25_1 | 0)) {
              continue label$42
             }
             break label$42;
            };
           }
           if ($28_1 >>> 0 < 7 >>> 0) {
            break label$26
           }
           label$43 : while (1) {
            HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
            HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
            HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
            HEAP8[($3_1 + 3 | 0) >> 0] = HEAPU8[($2_1 + 3 | 0) >> 0] | 0;
            HEAP8[($3_1 + 4 | 0) >> 0] = HEAPU8[($2_1 + 4 | 0) >> 0] | 0;
            HEAP8[($3_1 + 5 | 0) >> 0] = HEAPU8[($2_1 + 5 | 0) >> 0] | 0;
            HEAP8[($3_1 + 6 | 0) >> 0] = HEAPU8[($2_1 + 6 | 0) >> 0] | 0;
            HEAP8[($3_1 + 7 | 0) >> 0] = HEAPU8[($2_1 + 7 | 0) >> 0] | 0;
            $3_1 = $3_1 + 8 | 0;
            $2_1 = $2_1 + 8 | 0;
            $22_1 = $22_1 + -8 | 0;
            if ($22_1) {
             continue label$43
            }
            break label$43;
           };
          }
          $2_1 = $3_1 - $26_1 | 0;
          $24_1 = $24_1 - $27_1 | 0;
         }
         label$44 : {
          if ($24_1 >>> 0 < 3 >>> 0) {
           break label$44
          }
          $22_1 = 0;
          label$45 : {
           $27_1 = $24_1 + -3 | 0;
           $23_1 = ((($27_1 >>> 0) / (3 >>> 0) | 0) + 1 | 0) & 3 | 0;
           if (!$23_1) {
            break label$45
           }
           label$46 : while (1) {
            HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
            HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
            HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
            $24_1 = $24_1 + -3 | 0;
            $3_1 = $3_1 + 3 | 0;
            $2_1 = $2_1 + 3 | 0;
            $22_1 = $22_1 + 1 | 0;
            if (($22_1 | 0) != ($23_1 | 0)) {
             continue label$46
            }
            break label$46;
           };
          }
          if ($27_1 >>> 0 < 9 >>> 0) {
           break label$44
          }
          label$47 : while (1) {
           HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
           HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
           HEAP8[($3_1 + 2 | 0) >> 0] = HEAPU8[($2_1 + 2 | 0) >> 0] | 0;
           HEAP8[($3_1 + 3 | 0) >> 0] = HEAPU8[($2_1 + 3 | 0) >> 0] | 0;
           HEAP8[($3_1 + 4 | 0) >> 0] = HEAPU8[($2_1 + 4 | 0) >> 0] | 0;
           HEAP8[($3_1 + 5 | 0) >> 0] = HEAPU8[($2_1 + 5 | 0) >> 0] | 0;
           HEAP8[($3_1 + 6 | 0) >> 0] = HEAPU8[($2_1 + 6 | 0) >> 0] | 0;
           HEAP8[($3_1 + 7 | 0) >> 0] = HEAPU8[($2_1 + 7 | 0) >> 0] | 0;
           HEAP8[($3_1 + 8 | 0) >> 0] = HEAPU8[($2_1 + 8 | 0) >> 0] | 0;
           HEAP8[($3_1 + 9 | 0) >> 0] = HEAPU8[($2_1 + 9 | 0) >> 0] | 0;
           HEAP8[($3_1 + 10 | 0) >> 0] = HEAPU8[($2_1 + 10 | 0) >> 0] | 0;
           HEAP8[($3_1 + 11 | 0) >> 0] = HEAPU8[($2_1 + 11 | 0) >> 0] | 0;
           $3_1 = $3_1 + 12 | 0;
           $2_1 = $2_1 + 12 | 0;
           $24_1 = $24_1 + -12 | 0;
           if ($24_1 >>> 0 > 2 >>> 0) {
            continue label$47
           }
           break label$47;
          };
         }
         if (!$24_1) {
          break label$6
         }
         HEAP8[$3_1 >> 0] = HEAPU8[$2_1 >> 0] | 0;
         if (($24_1 | 0) != (1 | 0)) {
          break label$22
         }
         $3_1 = $3_1 + 1 | 0;
         break label$6;
        }
        $23_1 = $3_1 - $26_1 | 0;
        label$48 : while (1) {
         $2_1 = $3_1;
         $22_1 = $23_1;
         HEAP8[$2_1 >> 0] = HEAPU8[$22_1 >> 0] | 0;
         HEAP8[($2_1 + 1 | 0) >> 0] = HEAPU8[($22_1 + 1 | 0) >> 0] | 0;
         HEAP8[($2_1 + 2 | 0) >> 0] = HEAPU8[($22_1 + 2 | 0) >> 0] | 0;
         $3_1 = $2_1 + 3 | 0;
         $23_1 = $22_1 + 3 | 0;
         $24_1 = $24_1 + -3 | 0;
         if ($24_1 >>> 0 > 2 >>> 0) {
          continue label$48
         }
         break label$48;
        };
        if (!$24_1) {
         break label$6
        }
        HEAP8[($2_1 + 3 | 0) >> 0] = HEAPU8[$23_1 >> 0] | 0;
        label$49 : {
         if (($24_1 | 0) != (1 | 0)) {
          break label$49
         }
         $3_1 = $2_1 + 4 | 0;
         break label$6;
        }
        HEAP8[($2_1 + 4 | 0) >> 0] = HEAPU8[($22_1 + 4 | 0) >> 0] | 0;
        $3_1 = $2_1 + 5 | 0;
        break label$6;
       }
       HEAP8[($3_1 + 1 | 0) >> 0] = HEAPU8[($2_1 + 1 | 0) >> 0] | 0;
       $3_1 = $3_1 + 2 | 0;
      }
      if ($14_1 >>> 0 >= $15_1 >>> 0) {
       break label$1
      }
      if ($3_1 >>> 0 < $12_1 >>> 0) {
       continue label$3
      }
      break label$1;
     }
     break label$3;
    };
    HEAP32[($0_1 + 24 | 0) >> 2] = $22_1;
    $2_1 = 16209;
   }
   HEAP32[($6_1 + 4 | 0) >> 2] = $2_1;
  }
  HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
  $2_1 = $14_1 - ($4_1 >>> 3 | 0) | 0;
  HEAP32[$0_1 >> 2] = $2_1;
  HEAP32[($0_1 + 16 | 0) >> 2] = ($12_1 - $3_1 | 0) + 257 | 0;
  HEAP32[($0_1 + 4 | 0) >> 2] = ($15_1 - $2_1 | 0) + 5 | 0;
  $3_1 = $4_1 & 7 | 0;
  HEAP32[($6_1 + 64 | 0) >> 2] = $3_1;
  HEAP32[($6_1 + 60 | 0) >> 2] = $1_1 & ((-1 << $3_1 | 0) ^ -1 | 0) | 0;
 }
 
 function $16($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $4_1 = 0, i64toi32_i32$0 = 0, $6_1 = 0, $5_1 = 0, $2_1 = 0, $3_1 = 0;
  $2_1 = -2;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   if (!(HEAP32[($0_1 + 32 | 0) >> 2] | 0)) {
    break label$1
   }
   $3_1 = HEAP32[($0_1 + 36 | 0) >> 2] | 0;
   if (!$3_1) {
    break label$1
   }
   $4_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
   if (!$4_1) {
    break label$1
   }
   if ((HEAP32[$4_1 >> 2] | 0 | 0) != ($0_1 | 0)) {
    break label$1
   }
   if (((HEAP32[($4_1 + 4 | 0) >> 2] | 0) + -16180 | 0) >>> 0 > 31 >>> 0) {
    break label$1
   }
   label$2 : {
    label$3 : {
     if (($1_1 | 0) > (-1 | 0)) {
      break label$3
     }
     if ($1_1 >>> 0 < -15 >>> 0) {
      break label$1
     }
     $5_1 = 0;
     $6_1 = 0 - $1_1 | 0;
     break label$2;
    }
    $6_1 = $1_1 >>> 0 < 48 >>> 0 ? $1_1 & 15 | 0 : $1_1;
    $5_1 = ($1_1 >>> 4 | 0) + 5 | 0;
   }
   label$4 : {
    if (($6_1 + -8 | 0) >>> 0 < 8 >>> 0) {
     break label$4
    }
    if ($6_1) {
     break label$1
    }
   }
   label$5 : {
    label$6 : {
     label$7 : {
      $1_1 = HEAP32[($4_1 + 56 | 0) >> 2] | 0;
      if (!$1_1) {
       break label$7
      }
      if ((HEAP32[($4_1 + 40 | 0) >> 2] | 0 | 0) != ($6_1 | 0)) {
       break label$6
      }
     }
     HEAP32[($4_1 + 40 | 0) >> 2] = $6_1;
     HEAP32[($4_1 + 12 | 0) >> 2] = $5_1;
     break label$5;
    }
    FUNCTION_TABLE[$3_1 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, $1_1);
    HEAP32[($4_1 + 56 | 0) >> 2] = 0;
    $1_1 = HEAP32[($0_1 + 32 | 0) >> 2] | 0;
    HEAP32[($4_1 + 40 | 0) >> 2] = $6_1;
    HEAP32[($4_1 + 12 | 0) >> 2] = $5_1;
    if (!$1_1) {
     break label$1
    }
   }
   if (!(HEAP32[($0_1 + 36 | 0) >> 2] | 0)) {
    break label$1
   }
   $1_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
   if (!$1_1) {
    break label$1
   }
   if ((HEAP32[$1_1 >> 2] | 0 | 0) != ($0_1 | 0)) {
    break label$1
   }
   if (((HEAP32[($1_1 + 4 | 0) >> 2] | 0) + -16180 | 0) >>> 0 > 31 >>> 0) {
    break label$1
   }
   $2_1 = 0;
   HEAP32[($1_1 + 52 | 0) >> 2] = 0;
   i64toi32_i32$0 = 0;
   HEAP32[($1_1 + 44 | 0) >> 2] = 0;
   HEAP32[($1_1 + 48 | 0) >> 2] = i64toi32_i32$0;
   HEAP32[($1_1 + 32 | 0) >> 2] = 0;
   HEAP32[($0_1 + 8 | 0) >> 2] = 0;
   i64toi32_i32$0 = 0;
   HEAP32[($0_1 + 20 | 0) >> 2] = 0;
   HEAP32[($0_1 + 24 | 0) >> 2] = i64toi32_i32$0;
   label$8 : {
    $4_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
    if (!$4_1) {
     break label$8
    }
    HEAP32[($0_1 + 48 | 0) >> 2] = $4_1 & 1 | 0;
   }
   i64toi32_i32$0 = 0;
   HEAP32[($1_1 + 60 | 0) >> 2] = 0;
   HEAP32[($1_1 + 64 | 0) >> 2] = i64toi32_i32$0;
   HEAP32[($1_1 + 36 | 0) >> 2] = 0;
   HEAP32[($1_1 + 24 | 0) >> 2] = 32768;
   i64toi32_i32$0 = -1;
   HEAP32[($1_1 + 16 | 0) >> 2] = 0;
   HEAP32[($1_1 + 20 | 0) >> 2] = i64toi32_i32$0;
   i64toi32_i32$0 = 0;
   HEAP32[($1_1 + 4 | 0) >> 2] = 16180;
   HEAP32[($1_1 + 8 | 0) >> 2] = i64toi32_i32$0;
   i64toi32_i32$0 = -1;
   HEAP32[($1_1 + 7108 | 0) >> 2] = 1;
   HEAP32[($1_1 + 7112 | 0) >> 2] = i64toi32_i32$0;
   $0_1 = $1_1 + 1332 | 0;
   HEAP32[($1_1 + 112 | 0) >> 2] = $0_1;
   HEAP32[($1_1 + 84 | 0) >> 2] = $0_1;
   HEAP32[($1_1 + 80 | 0) >> 2] = $0_1;
  }
  return $2_1 | 0;
 }
 
 function $17($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0;
  $3_1 = -6;
  label$1 : {
   if (!$1_1) {
    break label$1
   }
   if (($2_1 | 0) != (56 | 0)) {
    break label$1
   }
   if (((HEAPU8[$1_1 >> 0] | 0) & 255 | 0 | 0) != (49 | 0)) {
    break label$1
   }
   label$2 : {
    if ($0_1) {
     break label$2
    }
    return -2 | 0;
   }
   HEAP32[($0_1 + 24 | 0) >> 2] = 0;
   label$3 : {
    $1_1 = HEAP32[($0_1 + 32 | 0) >> 2] | 0;
    if ($1_1) {
     break label$3
    }
    HEAP32[($0_1 + 40 | 0) >> 2] = 0;
    $1_1 = 1;
    HEAP32[($0_1 + 32 | 0) >> 2] = 1;
   }
   label$4 : {
    if (HEAP32[($0_1 + 36 | 0) >> 2] | 0) {
     break label$4
    }
    HEAP32[($0_1 + 36 | 0) >> 2] = 2;
   }
   label$5 : {
    $1_1 = FUNCTION_TABLE[$1_1 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, 1, 7120) | 0;
    if ($1_1) {
     break label$5
    }
    return -4 | 0;
   }
   HEAP32[($0_1 + 28 | 0) >> 2] = $1_1;
   $3_1 = 0;
   HEAP32[($1_1 + 56 | 0) >> 2] = 0;
   HEAP32[$1_1 >> 2] = $0_1;
   HEAP32[($1_1 + 4 | 0) >> 2] = 16180;
   $2_1 = $16($0_1 | 0, 15 | 0) | 0;
   if (!$2_1) {
    break label$1
   }
   FUNCTION_TABLE[HEAP32[($0_1 + 36 | 0) >> 2] | 0 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, $1_1);
   HEAP32[($0_1 + 28 | 0) >> 2] = 0;
   $3_1 = $2_1;
  }
  return $3_1 | 0;
 }
 
 function $18($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $5_1 = 0, $4_1 = 0, $22_1 = 0, $15_1 = 0, $7_1 = 0, $19_1 = 0, $16_1 = 0, $23_1 = 0, $24_1 = 0, $25_1 = 0, $31_1 = 0, $6_1 = 0, $17_1 = 0, $29_1 = 0, $20_1 = 0, $30_1 = 0, $2_1 = 0, $28_1 = 0, $3_1 = 0, $21_1 = 0, $27_1 = 0, $14_1 = 0, $10_1 = 0, $11_1 = 0, $13_1 = 0, $18_1 = 0, $12_1 = 0, $33_1 = 0, $26_1 = 0, $8_1 = 0, $9_1 = 0, $2676 = 0;
  $2_1 = global$0 - 16 | 0;
  global$0 = $2_1;
  $3_1 = -2;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   if (!(HEAP32[($0_1 + 32 | 0) >> 2] | 0)) {
    break label$1
   }
   if (!(HEAP32[($0_1 + 36 | 0) >> 2] | 0)) {
    break label$1
   }
   $4_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
   if (!$4_1) {
    break label$1
   }
   if ((HEAP32[$4_1 >> 2] | 0 | 0) != ($0_1 | 0)) {
    break label$1
   }
   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
   if (($5_1 + -16180 | 0) >>> 0 > 31 >>> 0) {
    break label$1
   }
   $6_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
   if (!$6_1) {
    break label$1
   }
   label$2 : {
    $7_1 = HEAP32[$0_1 >> 2] | 0;
    if ($7_1) {
     break label$2
    }
    if (HEAP32[($0_1 + 4 | 0) >> 2] | 0) {
     break label$1
    }
   }
   label$3 : {
    if (($5_1 | 0) != (16191 | 0)) {
     break label$3
    }
    $5_1 = 16192;
    HEAP32[($4_1 + 4 | 0) >> 2] = 16192;
   }
   $8_1 = $1_1 + -5 | 0;
   $9_1 = $4_1 + 92 | 0;
   $10_1 = $4_1 + 756 | 0;
   $11_1 = $4_1 + 116 | 0;
   $12_1 = $4_1 + 88 | 0;
   $13_1 = $4_1 + 112 | 0;
   $14_1 = $4_1 + 1332 | 0;
   $15_1 = HEAP32[($4_1 + 64 | 0) >> 2] | 0;
   $16_1 = HEAP32[($4_1 + 60 | 0) >> 2] | 0;
   $17_1 = 0;
   $18_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
   $19_1 = $18_1;
   $20_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
   $21_1 = $20_1;
   label$4 : {
    label$5 : {
     label$6 : {
      label$7 : {
       label$8 : while (1) {
        $22_1 = -3;
        $23_1 = 1;
        label$9 : {
         label$10 : {
          label$11 : {
           label$12 : {
            label$13 : {
             label$14 : {
              label$15 : {
               label$16 : {
                label$17 : {
                 label$18 : {
                  label$19 : {
                   label$20 : {
                    label$21 : {
                     label$22 : {
                      label$23 : {
                       label$24 : {
                        label$25 : {
                         label$26 : {
                          label$27 : {
                           label$28 : {
                            label$29 : {
                             label$30 : {
                              label$31 : {
                               label$32 : {
                                label$33 : {
                                 label$34 : {
                                  label$35 : {
                                   label$36 : {
                                    label$37 : {
                                     label$38 : {
                                      label$39 : {
                                       label$40 : {
                                        label$41 : {
                                         label$42 : {
                                          label$43 : {
                                           label$44 : {
                                            label$45 : {
                                             label$46 : {
                                              label$47 : {
                                               label$48 : {
                                                label$49 : {
                                                 label$50 : {
                                                  label$51 : {
                                                   label$52 : {
                                                    label$53 : {
                                                     label$54 : {
                                                      label$55 : {
                                                       label$56 : {
                                                        label$57 : {
                                                         label$58 : {
                                                          label$59 : {
                                                           label$60 : {
                                                            label$61 : {
                                                             label$62 : {
                                                              label$63 : {
                                                               label$64 : {
                                                                label$65 : {
                                                                 label$66 : {
                                                                  label$67 : {
                                                                   switch ($5_1 + -16180 | 0 | 0) {
                                                                   case 23:
                                                                    $23_1 = HEAP32[($4_1 + 76 | 0) >> 2] | 0;
                                                                    break label$32;
                                                                   case 21:
                                                                    $23_1 = HEAP32[($4_1 + 76 | 0) >> 2] | 0;
                                                                    break label$34;
                                                                   case 18:
                                                                    $23_1 = HEAP32[($4_1 + 108 | 0) >> 2] | 0;
                                                                    break label$37;
                                                                   case 27:
                                                                    $5_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
                                                                    break label$9;
                                                                   case 16:
                                                                    if ($15_1 >>> 0 >= 14 >>> 0) {
                                                                     break label$46
                                                                    }
                                                                    if (!$19_1) {
                                                                     break label$6
                                                                    }
                                                                    $5_1 = $15_1 + 8 | 0;
                                                                    $23_1 = $7_1 + 1 | 0;
                                                                    $22_1 = $19_1 + -1 | 0;
                                                                    $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                                    if ($15_1 >>> 0 <= 5 >>> 0) {
                                                                     break label$47
                                                                    }
                                                                    $7_1 = $23_1;
                                                                    $19_1 = $22_1;
                                                                    $15_1 = $5_1;
                                                                    break label$46;
                                                                   case 9:
                                                                    if ($15_1 >>> 0 >= 32 >>> 0) {
                                                                     break label$54
                                                                    }
                                                                    if (!$19_1) {
                                                                     break label$6
                                                                    }
                                                                    $22_1 = $7_1 + 1 | 0;
                                                                    $5_1 = $19_1 + -1 | 0;
                                                                    $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                                    if ($15_1 >>> 0 <= 23 >>> 0) {
                                                                     break label$55
                                                                    }
                                                                    $7_1 = $22_1;
                                                                    $19_1 = $5_1;
                                                                    break label$54;
                                                                   case 1:
                                                                    if ($15_1 >>> 0 >= 16 >>> 0) {
                                                                     break label$65
                                                                    }
                                                                    if (!$19_1) {
                                                                     break label$6
                                                                    }
                                                                    $5_1 = $15_1 + 8 | 0;
                                                                    $23_1 = $7_1 + 1 | 0;
                                                                    $22_1 = $19_1 + -1 | 0;
                                                                    $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                                    if ($15_1 >>> 0 <= 7 >>> 0) {
                                                                     break label$66
                                                                    }
                                                                    $7_1 = $23_1;
                                                                    $19_1 = $22_1;
                                                                    $15_1 = $5_1;
                                                                    break label$65;
                                                                   case 28:
                                                                    break label$10;
                                                                   case 8:
                                                                    break label$13;
                                                                   case 7:
                                                                    break label$14;
                                                                   case 6:
                                                                    break label$15;
                                                                   case 5:
                                                                    break label$16;
                                                                   case 24:
                                                                    break label$31;
                                                                   case 22:
                                                                    break label$33;
                                                                   case 20:
                                                                    break label$35;
                                                                   case 19:
                                                                    break label$36;
                                                                   case 30:
                                                                    break label$4;
                                                                   case 26:
                                                                    break label$43;
                                                                   case 25:
                                                                    break label$44;
                                                                   case 17:
                                                                    break label$45;
                                                                   case 15:
                                                                    break label$48;
                                                                   case 14:
                                                                    break label$49;
                                                                   case 29:
                                                                    break label$5;
                                                                   case 13:
                                                                    break label$50;
                                                                   case 12:
                                                                    break label$51;
                                                                   case 11:
                                                                    break label$52;
                                                                   case 10:
                                                                    break label$53;
                                                                   case 4:
                                                                    break label$58;
                                                                   case 3:
                                                                    break label$61;
                                                                   case 2:
                                                                    break label$64;
                                                                   case 0:
                                                                    break label$67;
                                                                   default:
                                                                    break label$1;
                                                                   };
                                                                  }
                                                                  $5_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
                                                                  if (!$5_1) {
                                                                   break label$42
                                                                  }
                                                                  label$75 : {
                                                                   if ($15_1 >>> 0 >= 16 >>> 0) {
                                                                    break label$75
                                                                   }
                                                                   if (!$19_1) {
                                                                    break label$6
                                                                   }
                                                                   $22_1 = $15_1 + 8 | 0;
                                                                   $24_1 = $7_1 + 1 | 0;
                                                                   $23_1 = $19_1 + -1 | 0;
                                                                   $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                                   label$76 : {
                                                                    if ($15_1 >>> 0 <= 7 >>> 0) {
                                                                     break label$76
                                                                    }
                                                                    $7_1 = $24_1;
                                                                    $19_1 = $23_1;
                                                                    $15_1 = $22_1;
                                                                    break label$75;
                                                                   }
                                                                   label$77 : {
                                                                    if ($23_1) {
                                                                     break label$77
                                                                    }
                                                                    $7_1 = $24_1;
                                                                    $19_1 = 0;
                                                                    $15_1 = $22_1;
                                                                    $22_1 = $17_1;
                                                                    break label$5;
                                                                   }
                                                                   $15_1 = $15_1 + 16 | 0;
                                                                   $19_1 = $19_1 + -2 | 0;
                                                                   $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $22_1 | 0) + $16_1 | 0;
                                                                   $7_1 = $7_1 + 2 | 0;
                                                                  }
                                                                  label$78 : {
                                                                   if (!($5_1 & 2 | 0)) {
                                                                    break label$78
                                                                   }
                                                                   if (($16_1 | 0) != (35615 | 0)) {
                                                                    break label$78
                                                                   }
                                                                   label$79 : {
                                                                    if (HEAP32[($4_1 + 40 | 0) >> 2] | 0) {
                                                                     break label$79
                                                                    }
                                                                    HEAP32[($4_1 + 40 | 0) >> 2] = 15;
                                                                   }
                                                                   $16_1 = 0;
                                                                   $5_1 = $12(0 | 0, 0 | 0, 0 | 0) | 0;
                                                                   HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                                                   $33_1 = 35615;
                                                                   HEAP8[($2_1 + 12 | 0) >> 0] = $33_1;
                                                                   HEAP8[($2_1 + 13 | 0) >> 0] = $33_1 >>> 8 | 0;
                                                                   $5_1 = $12($5_1 | 0, $2_1 + 12 | 0 | 0, 2 | 0) | 0;
                                                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16181;
                                                                   HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                                                   $15_1 = 0;
                                                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                   continue label$8;
                                                                  }
                                                                  label$80 : {
                                                                   $22_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                                                                   if (!$22_1) {
                                                                    break label$80
                                                                   }
                                                                   HEAP32[($22_1 + 48 | 0) >> 2] = -1;
                                                                  }
                                                                  label$81 : {
                                                                   label$82 : {
                                                                    if (!($5_1 & 1 | 0)) {
                                                                     break label$82
                                                                    }
                                                                    if (!((((($16_1 << 8 | 0) & 65280 | 0) + ($16_1 >>> 8 | 0) | 0) >>> 0) % (31 >>> 0) | 0)) {
                                                                     break label$81
                                                                    }
                                                                   }
                                                                   HEAP32[($0_1 + 24 | 0) >> 2] = 65788;
                                                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                   continue label$8;
                                                                  }
                                                                  label$83 : {
                                                                   if (($16_1 & 15 | 0 | 0) == (8 | 0)) {
                                                                    break label$83
                                                                   }
                                                                   HEAP32[($0_1 + 24 | 0) >> 2] = 65994;
                                                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                   continue label$8;
                                                                  }
                                                                  $24_1 = $16_1 >>> 4 | 0;
                                                                  $5_1 = $24_1 & 15 | 0;
                                                                  $22_1 = $5_1 + 8 | 0;
                                                                  label$84 : {
                                                                   $23_1 = HEAP32[($4_1 + 40 | 0) >> 2] | 0;
                                                                   if ($23_1) {
                                                                    break label$84
                                                                   }
                                                                   HEAP32[($4_1 + 40 | 0) >> 2] = $22_1;
                                                                   $23_1 = $22_1;
                                                                  }
                                                                  label$85 : {
                                                                   label$86 : {
                                                                    if ($5_1 >>> 0 > 7 >>> 0) {
                                                                     break label$86
                                                                    }
                                                                    if ($22_1 >>> 0 <= $23_1 >>> 0) {
                                                                     break label$85
                                                                    }
                                                                   }
                                                                   $15_1 = $15_1 + -4 | 0;
                                                                   HEAP32[($0_1 + 24 | 0) >> 2] = 65905;
                                                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                                   $16_1 = $24_1;
                                                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                   continue label$8;
                                                                  }
                                                                  $15_1 = 0;
                                                                  HEAP32[($4_1 + 20 | 0) >> 2] = 0;
                                                                  HEAP32[($4_1 + 24 | 0) >> 2] = 256 << $5_1 | 0;
                                                                  $5_1 = $14(0 | 0, 0 | 0, 0 | 0) | 0;
                                                                  HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                                                  HEAP32[($0_1 + 48 | 0) >> 2] = $5_1;
                                                                  HEAP32[($4_1 + 4 | 0) >> 2] = $16_1 & 8192 | 0 ? 16189 : 16191;
                                                                  $16_1 = 0;
                                                                  $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                  continue label$8;
                                                                 }
                                                                 label$87 : {
                                                                  if ($22_1) {
                                                                   break label$87
                                                                  }
                                                                  $7_1 = $23_1;
                                                                  $19_1 = 0;
                                                                  $15_1 = $5_1;
                                                                  $22_1 = $17_1;
                                                                  break label$5;
                                                                 }
                                                                 $15_1 = $15_1 + 16 | 0;
                                                                 $19_1 = $19_1 + -2 | 0;
                                                                 $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                                                 $7_1 = $7_1 + 2 | 0;
                                                                }
                                                                HEAP32[($4_1 + 20 | 0) >> 2] = $16_1;
                                                                label$88 : {
                                                                 if (($16_1 & 255 | 0 | 0) == (8 | 0)) {
                                                                  break label$88
                                                                 }
                                                                 HEAP32[($0_1 + 24 | 0) >> 2] = 65994;
                                                                 HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                                 $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                 continue label$8;
                                                                }
                                                                label$89 : {
                                                                 if (!($16_1 & 57344 | 0)) {
                                                                  break label$89
                                                                 }
                                                                 HEAP32[($0_1 + 24 | 0) >> 2] = 65613;
                                                                 HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                                 $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                                 continue label$8;
                                                                }
                                                                label$90 : {
                                                                 $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                                                                 if (!$5_1) {
                                                                  break label$90
                                                                 }
                                                                 HEAP32[$5_1 >> 2] = ($16_1 >>> 8 | 0) & 1 | 0;
                                                                }
                                                                label$91 : {
                                                                 if (!($16_1 & 512 | 0)) {
                                                                  break label$91
                                                                 }
                                                                 if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                                                                  break label$91
                                                                 }
                                                                 HEAP8[($2_1 + 12 | 0) >> 0] = $16_1;
                                                                 HEAP8[($2_1 + 13 | 0) >> 0] = $16_1 >>> 8 | 0;
                                                                 HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $2_1 + 12 | 0 | 0, 2 | 0) | 0;
                                                                }
                                                                HEAP32[($4_1 + 4 | 0) >> 2] = 16182;
                                                                $15_1 = 0;
                                                                $16_1 = 0;
                                                                break label$63;
                                                               }
                                                               if ($15_1 >>> 0 > 31 >>> 0) {
                                                                break label$62
                                                               }
                                                              }
                                                              if (!$19_1) {
                                                               break label$6
                                                              }
                                                              $22_1 = $7_1 + 1 | 0;
                                                              $5_1 = $19_1 + -1 | 0;
                                                              $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                              label$92 : {
                                                               if ($15_1 >>> 0 <= 23 >>> 0) {
                                                                break label$92
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = $5_1;
                                                               break label$62;
                                                              }
                                                              $23_1 = $15_1 + 8 | 0;
                                                              label$93 : {
                                                               if ($5_1) {
                                                                break label$93
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = 0;
                                                               $15_1 = $23_1;
                                                               $22_1 = $17_1;
                                                               break label$5;
                                                              }
                                                              $22_1 = $7_1 + 2 | 0;
                                                              $5_1 = $19_1 + -2 | 0;
                                                              $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
                                                              label$94 : {
                                                               if ($15_1 >>> 0 <= 15 >>> 0) {
                                                                break label$94
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = $5_1;
                                                               break label$62;
                                                              }
                                                              $23_1 = $15_1 + 16 | 0;
                                                              label$95 : {
                                                               if ($5_1) {
                                                                break label$95
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = 0;
                                                               $15_1 = $23_1;
                                                               $22_1 = $17_1;
                                                               break label$5;
                                                              }
                                                              $22_1 = $7_1 + 3 | 0;
                                                              $5_1 = $19_1 + -3 | 0;
                                                              $16_1 = ((HEAPU8[($7_1 + 2 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
                                                              label$96 : {
                                                               if ($15_1 >>> 0 <= 7 >>> 0) {
                                                                break label$96
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = $5_1;
                                                               break label$62;
                                                              }
                                                              $15_1 = $15_1 + 24 | 0;
                                                              label$97 : {
                                                               if ($5_1) {
                                                                break label$97
                                                               }
                                                               $7_1 = $22_1;
                                                               $19_1 = 0;
                                                               $22_1 = $17_1;
                                                               break label$5;
                                                              }
                                                              $19_1 = $19_1 + -4 | 0;
                                                              $16_1 = ((HEAPU8[($7_1 + 3 | 0) >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                              $7_1 = $7_1 + 4 | 0;
                                                             }
                                                             label$98 : {
                                                              $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                                                              if (!$5_1) {
                                                               break label$98
                                                              }
                                                              HEAP32[($5_1 + 4 | 0) >> 2] = $16_1;
                                                             }
                                                             label$99 : {
                                                              if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 2 | 0)) {
                                                               break label$99
                                                              }
                                                              if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                                                               break label$99
                                                              }
                                                              HEAP8[($2_1 + 12 | 0) >> 0] = $16_1;
                                                              HEAP8[($2_1 + 13 | 0) >> 0] = $16_1 >>> 8 | 0;
                                                              HEAP8[($2_1 + 14 | 0) >> 0] = $16_1 >>> 16 | 0;
                                                              HEAP8[($2_1 + 15 | 0) >> 0] = $16_1 >>> 24 | 0;
                                                              HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $2_1 + 12 | 0 | 0, 4 | 0) | 0;
                                                             }
                                                             HEAP32[($4_1 + 4 | 0) >> 2] = 16183;
                                                             $15_1 = 0;
                                                             $16_1 = 0;
                                                             break label$60;
                                                            }
                                                            if ($15_1 >>> 0 > 15 >>> 0) {
                                                             break label$59
                                                            }
                                                           }
                                                           if (!$19_1) {
                                                            break label$6
                                                           }
                                                           $22_1 = $7_1 + 1 | 0;
                                                           $5_1 = $19_1 + -1 | 0;
                                                           $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                           label$100 : {
                                                            if ($15_1 >>> 0 <= 7 >>> 0) {
                                                             break label$100
                                                            }
                                                            $7_1 = $22_1;
                                                            $19_1 = $5_1;
                                                            break label$59;
                                                           }
                                                           $15_1 = $15_1 + 8 | 0;
                                                           label$101 : {
                                                            if ($5_1) {
                                                             break label$101
                                                            }
                                                            $7_1 = $22_1;
                                                            $19_1 = 0;
                                                            $22_1 = $17_1;
                                                            break label$5;
                                                           }
                                                           $19_1 = $19_1 + -2 | 0;
                                                           $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                           $7_1 = $7_1 + 2 | 0;
                                                          }
                                                          label$102 : {
                                                           $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                                                           if (!$5_1) {
                                                            break label$102
                                                           }
                                                           HEAP32[($5_1 + 12 | 0) >> 2] = $16_1 >>> 8 | 0;
                                                           HEAP32[($5_1 + 8 | 0) >> 2] = $16_1 & 255 | 0;
                                                          }
                                                          label$103 : {
                                                           if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 2 | 0)) {
                                                            break label$103
                                                           }
                                                           if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                                                            break label$103
                                                           }
                                                           HEAP8[($2_1 + 12 | 0) >> 0] = $16_1;
                                                           HEAP8[($2_1 + 13 | 0) >> 0] = $16_1 >>> 8 | 0;
                                                           HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $2_1 + 12 | 0 | 0, 2 | 0) | 0;
                                                          }
                                                          HEAP32[($4_1 + 4 | 0) >> 2] = 16184;
                                                          $5_1 = 0;
                                                          $15_1 = 0;
                                                          $16_1 = 0;
                                                          $22_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
                                                          if ($22_1 & 1024 | 0) {
                                                           break label$57
                                                          }
                                                          break label$18;
                                                         }
                                                         label$104 : {
                                                          $22_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
                                                          if ($22_1 & 1024 | 0) {
                                                           break label$104
                                                          }
                                                          $5_1 = $15_1;
                                                          break label$18;
                                                         }
                                                         $5_1 = $16_1;
                                                         if ($15_1 >>> 0 > 15 >>> 0) {
                                                          break label$56
                                                         }
                                                        }
                                                        label$105 : {
                                                         if ($19_1) {
                                                          break label$105
                                                         }
                                                         $19_1 = 0;
                                                         $16_1 = $5_1;
                                                         $22_1 = $17_1;
                                                         break label$5;
                                                        }
                                                        $24_1 = $7_1 + 1 | 0;
                                                        $23_1 = $19_1 + -1 | 0;
                                                        $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $5_1 | 0;
                                                        label$106 : {
                                                         if ($15_1 >>> 0 <= 7 >>> 0) {
                                                          break label$106
                                                         }
                                                         $7_1 = $24_1;
                                                         $19_1 = $23_1;
                                                         break label$56;
                                                        }
                                                        $5_1 = $15_1 + 8 | 0;
                                                        label$107 : {
                                                         if ($23_1) {
                                                          break label$107
                                                         }
                                                         $7_1 = $24_1;
                                                         $19_1 = 0;
                                                         $15_1 = $5_1;
                                                         $22_1 = $17_1;
                                                         break label$5;
                                                        }
                                                        $19_1 = $19_1 + -2 | 0;
                                                        $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                                        $7_1 = $7_1 + 2 | 0;
                                                       }
                                                       HEAP32[($4_1 + 68 | 0) >> 2] = $16_1;
                                                       label$108 : {
                                                        $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                                                        if (!$5_1) {
                                                         break label$108
                                                        }
                                                        HEAP32[($5_1 + 20 | 0) >> 2] = $16_1;
                                                       }
                                                       $15_1 = 0;
                                                       label$109 : {
                                                        if (!($22_1 & 512 | 0)) {
                                                         break label$109
                                                        }
                                                        if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                                                         break label$109
                                                        }
                                                        HEAP8[($2_1 + 12 | 0) >> 0] = $16_1;
                                                        HEAP8[($2_1 + 13 | 0) >> 0] = $16_1 >>> 8 | 0;
                                                        HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $2_1 + 12 | 0 | 0, 2 | 0) | 0;
                                                       }
                                                       $16_1 = 0;
                                                       break label$17;
                                                      }
                                                      $23_1 = $15_1 + 8 | 0;
                                                      label$110 : {
                                                       if ($5_1) {
                                                        break label$110
                                                       }
                                                       $7_1 = $22_1;
                                                       $19_1 = 0;
                                                       $15_1 = $23_1;
                                                       $22_1 = $17_1;
                                                       break label$5;
                                                      }
                                                      $22_1 = $7_1 + 2 | 0;
                                                      $5_1 = $19_1 + -2 | 0;
                                                      $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
                                                      label$111 : {
                                                       if ($15_1 >>> 0 <= 15 >>> 0) {
                                                        break label$111
                                                       }
                                                       $7_1 = $22_1;
                                                       $19_1 = $5_1;
                                                       break label$54;
                                                      }
                                                      $23_1 = $15_1 + 16 | 0;
                                                      label$112 : {
                                                       if ($5_1) {
                                                        break label$112
                                                       }
                                                       $7_1 = $22_1;
                                                       $19_1 = 0;
                                                       $15_1 = $23_1;
                                                       $22_1 = $17_1;
                                                       break label$5;
                                                      }
                                                      $22_1 = $7_1 + 3 | 0;
                                                      $5_1 = $19_1 + -3 | 0;
                                                      $16_1 = ((HEAPU8[($7_1 + 2 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
                                                      label$113 : {
                                                       if ($15_1 >>> 0 <= 7 >>> 0) {
                                                        break label$113
                                                       }
                                                       $7_1 = $22_1;
                                                       $19_1 = $5_1;
                                                       break label$54;
                                                      }
                                                      $15_1 = $15_1 + 24 | 0;
                                                      label$114 : {
                                                       if ($5_1) {
                                                        break label$114
                                                       }
                                                       $7_1 = $22_1;
                                                       $19_1 = 0;
                                                       $22_1 = $17_1;
                                                       break label$5;
                                                      }
                                                      $19_1 = $19_1 + -4 | 0;
                                                      $16_1 = ((HEAPU8[($7_1 + 3 | 0) >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                      $7_1 = $7_1 + 4 | 0;
                                                     }
                                                     $5_1 = $16_1 << 24 | 0 | (($16_1 & 65280 | 0) << 8 | 0) | 0 | (($16_1 >>> 8 | 0) & 65280 | 0 | ($16_1 >>> 24 | 0) | 0) | 0;
                                                     HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                                     HEAP32[($0_1 + 48 | 0) >> 2] = $5_1;
                                                     HEAP32[($4_1 + 4 | 0) >> 2] = 16190;
                                                     $16_1 = 0;
                                                     $15_1 = 0;
                                                    }
                                                    label$115 : {
                                                     if (HEAP32[($4_1 + 16 | 0) >> 2] | 0) {
                                                      break label$115
                                                     }
                                                     HEAP32[($0_1 + 16 | 0) >> 2] = $20_1;
                                                     HEAP32[($0_1 + 12 | 0) >> 2] = $6_1;
                                                     HEAP32[($0_1 + 4 | 0) >> 2] = $19_1;
                                                     HEAP32[$0_1 >> 2] = $7_1;
                                                     HEAP32[($4_1 + 64 | 0) >> 2] = $15_1;
                                                     HEAP32[($4_1 + 60 | 0) >> 2] = $16_1;
                                                     $3_1 = 2;
                                                     break label$1;
                                                    }
                                                    $5_1 = $14(0 | 0, 0 | 0, 0 | 0) | 0;
                                                    HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                                    HEAP32[($0_1 + 48 | 0) >> 2] = $5_1;
                                                    HEAP32[($4_1 + 4 | 0) >> 2] = 16191;
                                                   }
                                                   if ($8_1 >>> 0 < 2 >>> 0) {
                                                    break label$11
                                                   }
                                                  }
                                                  label$116 : {
                                                   label$117 : {
                                                    label$118 : {
                                                     if (HEAP32[($4_1 + 8 | 0) >> 2] | 0) {
                                                      break label$118
                                                     }
                                                     if ($15_1 >>> 0 < 3 >>> 0) {
                                                      break label$117
                                                     }
                                                     $22_1 = $15_1;
                                                     break label$116;
                                                    }
                                                    HEAP32[($4_1 + 4 | 0) >> 2] = 16206;
                                                    $16_1 = $16_1 >>> ($15_1 & 7 | 0) | 0;
                                                    $15_1 = $15_1 & -8 | 0;
                                                    $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                    continue label$8;
                                                   }
                                                   if (!$19_1) {
                                                    break label$6
                                                   }
                                                   $22_1 = $15_1 + 8 | 0;
                                                   $19_1 = $19_1 + -1 | 0;
                                                   $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                   $7_1 = $7_1 + 1 | 0;
                                                  }
                                                  HEAP32[($4_1 + 8 | 0) >> 2] = $16_1 & 1 | 0;
                                                  $5_1 = 16193;
                                                  label$119 : {
                                                   label$120 : {
                                                    label$121 : {
                                                     switch (($16_1 >>> 1 | 0) & 3 | 0 | 0) {
                                                     case 1:
                                                      HEAP32[($4_1 + 80 | 0) >> 2] = 72192;
                                                      HEAP32[($4_1 + 88 | 0) >> 2] = 9;
                                                      HEAP32[($4_1 + 92 | 0) >> 2] = 5;
                                                      HEAP32[($4_1 + 84 | 0) >> 2] = 74240;
                                                      HEAP32[($4_1 + 4 | 0) >> 2] = 16199;
                                                      if (($1_1 | 0) != (6 | 0)) {
                                                       break label$119
                                                      }
                                                      $15_1 = $22_1 + -3 | 0;
                                                      $16_1 = $16_1 >>> 3 | 0;
                                                      $22_1 = $17_1;
                                                      break label$5;
                                                     case 2:
                                                      $5_1 = 16196;
                                                      break label$120;
                                                     case 3:
                                                      break label$121;
                                                     default:
                                                      break label$120;
                                                     };
                                                    }
                                                    HEAP32[($0_1 + 24 | 0) >> 2] = 65925;
                                                    $5_1 = 16209;
                                                   }
                                                   HEAP32[($4_1 + 4 | 0) >> 2] = $5_1;
                                                  }
                                                  $15_1 = $22_1 + -3 | 0;
                                                  $16_1 = $16_1 >>> 3 | 0;
                                                  $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                  continue label$8;
                                                 }
                                                 $16_1 = $16_1 >>> ($15_1 & 7 | 0) | 0;
                                                 label$124 : {
                                                  $15_1 = $15_1 & -8 | 0;
                                                  if ($15_1 >>> 0 > 31 >>> 0) {
                                                   break label$124
                                                  }
                                                  if (!$19_1) {
                                                   break label$6
                                                  }
                                                  $5_1 = $15_1 + 8 | 0;
                                                  $23_1 = $7_1 + 1 | 0;
                                                  $22_1 = $19_1 + -1 | 0;
                                                  $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                                  label$125 : {
                                                   if ($15_1 >>> 0 <= 23 >>> 0) {
                                                    break label$125
                                                   }
                                                   $7_1 = $23_1;
                                                   $19_1 = $22_1;
                                                   $15_1 = $5_1;
                                                   break label$124;
                                                  }
                                                  label$126 : {
                                                   if ($22_1) {
                                                    break label$126
                                                   }
                                                   $7_1 = $23_1;
                                                   $19_1 = 0;
                                                   $15_1 = $5_1;
                                                   $22_1 = $17_1;
                                                   break label$5;
                                                  }
                                                  $22_1 = $15_1 + 16 | 0;
                                                  $24_1 = $7_1 + 2 | 0;
                                                  $23_1 = $19_1 + -2 | 0;
                                                  $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                                  label$127 : {
                                                   if ($15_1 >>> 0 <= 15 >>> 0) {
                                                    break label$127
                                                   }
                                                   $7_1 = $24_1;
                                                   $19_1 = $23_1;
                                                   $15_1 = $22_1;
                                                   break label$124;
                                                  }
                                                  label$128 : {
                                                   if ($23_1) {
                                                    break label$128
                                                   }
                                                   $7_1 = $24_1;
                                                   $19_1 = 0;
                                                   $15_1 = $22_1;
                                                   $22_1 = $17_1;
                                                   break label$5;
                                                  }
                                                  $23_1 = $15_1 + 24 | 0;
                                                  $24_1 = $7_1 + 3 | 0;
                                                  $5_1 = $19_1 + -3 | 0;
                                                  $16_1 = ((HEAPU8[($7_1 + 2 | 0) >> 0] | 0) << $22_1 | 0) + $16_1 | 0;
                                                  label$129 : {
                                                   if (!$15_1) {
                                                    break label$129
                                                   }
                                                   $7_1 = $24_1;
                                                   $19_1 = $5_1;
                                                   $15_1 = $23_1;
                                                   break label$124;
                                                  }
                                                  label$130 : {
                                                   if ($5_1) {
                                                    break label$130
                                                   }
                                                   $7_1 = $24_1;
                                                   $19_1 = 0;
                                                   $15_1 = $23_1;
                                                   $22_1 = $17_1;
                                                   break label$5;
                                                  }
                                                  $15_1 = $15_1 + 32 | 0;
                                                  $19_1 = $19_1 + -4 | 0;
                                                  $16_1 = ((HEAPU8[($7_1 + 3 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
                                                  $7_1 = $7_1 + 4 | 0;
                                                 }
                                                 label$131 : {
                                                  $5_1 = $16_1 & 65535 | 0;
                                                  if (($5_1 | 0) == (($16_1 ^ -1 | 0) >>> 16 | 0 | 0)) {
                                                   break label$131
                                                  }
                                                  HEAP32[($0_1 + 24 | 0) >> 2] = 65722;
                                                  HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                  $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                  continue label$8;
                                                 }
                                                 HEAP32[($4_1 + 4 | 0) >> 2] = 16194;
                                                 HEAP32[($4_1 + 68 | 0) >> 2] = $5_1;
                                                 $16_1 = 0;
                                                 $15_1 = 0;
                                                 if (($1_1 | 0) != (6 | 0)) {
                                                  break label$49
                                                 }
                                                 $15_1 = 0;
                                                 break label$11;
                                                }
                                                HEAP32[($4_1 + 4 | 0) >> 2] = 16195;
                                               }
                                               label$132 : {
                                                $5_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                                                if (!$5_1) {
                                                 break label$132
                                                }
                                                $5_1 = $5_1 >>> 0 < $19_1 >>> 0 ? $5_1 : $19_1;
                                                $5_1 = $5_1 >>> 0 < $20_1 >>> 0 ? $5_1 : $20_1;
                                                if (!$5_1) {
                                                 break label$11
                                                }
                                                $6_1 = $24($6_1 | 0, $7_1 | 0, $5_1 | 0) | 0;
                                                HEAP32[($4_1 + 68 | 0) >> 2] = (HEAP32[($4_1 + 68 | 0) >> 2] | 0) - $5_1 | 0;
                                                $6_1 = $6_1 + $5_1 | 0;
                                                $20_1 = $20_1 - $5_1 | 0;
                                                $7_1 = $7_1 + $5_1 | 0;
                                                $19_1 = $19_1 - $5_1 | 0;
                                                $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                continue label$8;
                                               }
                                               HEAP32[($4_1 + 4 | 0) >> 2] = 16191;
                                               $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                               continue label$8;
                                              }
                                              label$133 : {
                                               if ($22_1) {
                                                break label$133
                                               }
                                               $7_1 = $23_1;
                                               $19_1 = 0;
                                               $15_1 = $5_1;
                                               $22_1 = $17_1;
                                               break label$5;
                                              }
                                              $15_1 = $15_1 + 16 | 0;
                                              $19_1 = $19_1 + -2 | 0;
                                              $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                              $7_1 = $7_1 + 2 | 0;
                                             }
                                             $5_1 = $16_1 & 31 | 0;
                                             HEAP32[($4_1 + 100 | 0) >> 2] = $5_1 + 257 | 0;
                                             $22_1 = ($16_1 >>> 5 | 0) & 31 | 0;
                                             HEAP32[($4_1 + 104 | 0) >> 2] = $22_1 + 1 | 0;
                                             $24_1 = (($16_1 >>> 10 | 0) & 15 | 0) + 4 | 0;
                                             HEAP32[($4_1 + 96 | 0) >> 2] = $24_1;
                                             $15_1 = $15_1 + -14 | 0;
                                             $16_1 = $16_1 >>> 14 | 0;
                                             label$134 : {
                                              label$135 : {
                                               if ($5_1 >>> 0 > 29 >>> 0) {
                                                break label$135
                                               }
                                               if ($22_1 >>> 0 < 30 >>> 0) {
                                                break label$134
                                               }
                                              }
                                              HEAP32[($0_1 + 24 | 0) >> 2] = 65686;
                                              HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                              $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                              continue label$8;
                                             }
                                             HEAP32[($4_1 + 4 | 0) >> 2] = 16197;
                                             $5_1 = 0;
                                             HEAP32[($4_1 + 108 | 0) >> 2] = 0;
                                             break label$39;
                                            }
                                            $5_1 = HEAP32[($4_1 + 108 | 0) >> 2] | 0;
                                            $24_1 = HEAP32[($4_1 + 96 | 0) >> 2] | 0;
                                            if ($5_1 >>> 0 < $24_1 >>> 0) {
                                             break label$39
                                            }
                                            break label$38;
                                           }
                                           if (!$20_1) {
                                            break label$30
                                           }
                                           HEAP8[$6_1 >> 0] = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                                           HEAP32[($4_1 + 4 | 0) >> 2] = 16200;
                                           $20_1 = $20_1 + -1 | 0;
                                           $6_1 = $6_1 + 1 | 0;
                                           $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                           continue label$8;
                                          }
                                          label$136 : {
                                           $5_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
                                           if ($5_1) {
                                            break label$136
                                           }
                                           $5_1 = 0;
                                           break label$40;
                                          }
                                          label$137 : {
                                           label$138 : {
                                            if ($15_1 >>> 0 <= 31 >>> 0) {
                                             break label$138
                                            }
                                            $23_1 = $7_1;
                                            break label$137;
                                           }
                                           if (!$19_1) {
                                            break label$6
                                           }
                                           $22_1 = $15_1 + 8 | 0;
                                           $23_1 = $7_1 + 1 | 0;
                                           $24_1 = $19_1 + -1 | 0;
                                           $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                           label$139 : {
                                            if ($15_1 >>> 0 <= 23 >>> 0) {
                                             break label$139
                                            }
                                            $19_1 = $24_1;
                                            $15_1 = $22_1;
                                            break label$137;
                                           }
                                           label$140 : {
                                            if ($24_1) {
                                             break label$140
                                            }
                                            $7_1 = $23_1;
                                            $19_1 = 0;
                                            $15_1 = $22_1;
                                            $22_1 = $17_1;
                                            break label$5;
                                           }
                                           $24_1 = $15_1 + 16 | 0;
                                           $23_1 = $7_1 + 2 | 0;
                                           $25_1 = $19_1 + -2 | 0;
                                           $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $22_1 | 0) + $16_1 | 0;
                                           label$141 : {
                                            if ($15_1 >>> 0 <= 15 >>> 0) {
                                             break label$141
                                            }
                                            $19_1 = $25_1;
                                            $15_1 = $24_1;
                                            break label$137;
                                           }
                                           label$142 : {
                                            if ($25_1) {
                                             break label$142
                                            }
                                            $7_1 = $23_1;
                                            $19_1 = 0;
                                            $15_1 = $24_1;
                                            $22_1 = $17_1;
                                            break label$5;
                                           }
                                           $25_1 = $15_1 + 24 | 0;
                                           $23_1 = $7_1 + 3 | 0;
                                           $22_1 = $19_1 + -3 | 0;
                                           $16_1 = ((HEAPU8[($7_1 + 2 | 0) >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
                                           label$143 : {
                                            if ($15_1 >>> 0 <= 7 >>> 0) {
                                             break label$143
                                            }
                                            $19_1 = $22_1;
                                            $15_1 = $25_1;
                                            break label$137;
                                           }
                                           label$144 : {
                                            if ($22_1) {
                                             break label$144
                                            }
                                            $7_1 = $23_1;
                                            $19_1 = 0;
                                            $15_1 = $25_1;
                                            $22_1 = $17_1;
                                            break label$5;
                                           }
                                           $15_1 = $15_1 + 32 | 0;
                                           $23_1 = $7_1 + 4 | 0;
                                           $19_1 = $19_1 + -4 | 0;
                                           $16_1 = ((HEAPU8[($7_1 + 3 | 0) >> 0] | 0) << $25_1 | 0) + $16_1 | 0;
                                          }
                                          $7_1 = $21_1 - $20_1 | 0;
                                          HEAP32[($0_1 + 20 | 0) >> 2] = (HEAP32[($0_1 + 20 | 0) >> 2] | 0) + $7_1 | 0;
                                          HEAP32[($4_1 + 32 | 0) >> 2] = (HEAP32[($4_1 + 32 | 0) >> 2] | 0) + $7_1 | 0;
                                          label$145 : {
                                           $22_1 = $5_1 & 4 | 0;
                                           if (!$22_1) {
                                            break label$145
                                           }
                                           if (($21_1 | 0) == ($20_1 | 0)) {
                                            break label$145
                                           }
                                           $5_1 = $6_1 - $7_1 | 0;
                                           $22_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
                                           label$146 : {
                                            label$147 : {
                                             if (!(HEAP32[($4_1 + 20 | 0) >> 2] | 0)) {
                                              break label$147
                                             }
                                             $5_1 = $12($22_1 | 0, $5_1 | 0, $7_1 | 0) | 0;
                                             break label$146;
                                            }
                                            $5_1 = $14($22_1 | 0, $5_1 | 0, $7_1 | 0) | 0;
                                           }
                                           HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
                                           HEAP32[($0_1 + 48 | 0) >> 2] = $5_1;
                                           $5_1 = HEAP32[($4_1 + 12 | 0) >> 2] | 0;
                                           $22_1 = $5_1 & 4 | 0;
                                          }
                                          if (!$22_1) {
                                           break label$41
                                          }
                                          if (((HEAP32[($4_1 + 20 | 0) >> 2] | 0 ? $16_1 : $16_1 << 24 | 0 | (($16_1 & 65280 | 0) << 8 | 0) | 0 | (($16_1 >>> 8 | 0) & 65280 | 0 | ($16_1 >>> 24 | 0) | 0) | 0) | 0) == (HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0)) {
                                           break label$41
                                          }
                                          HEAP32[($0_1 + 24 | 0) >> 2] = 65834;
                                          HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                          $7_1 = $23_1;
                                          $21_1 = $20_1;
                                          $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                          continue label$8;
                                         }
                                         HEAP32[($4_1 + 4 | 0) >> 2] = 16192;
                                         break label$20;
                                        }
                                        $7_1 = $23_1;
                                        $16_1 = 0;
                                        $15_1 = 0;
                                        $21_1 = $20_1;
                                       }
                                       HEAP32[($4_1 + 4 | 0) >> 2] = 16207;
                                       break label$9;
                                      }
                                      label$148 : while (1) {
                                       label$149 : {
                                        label$150 : {
                                         if ($15_1 >>> 0 <= 2 >>> 0) {
                                          break label$150
                                         }
                                         $23_1 = $15_1;
                                         break label$149;
                                        }
                                        if (!$19_1) {
                                         break label$6
                                        }
                                        $23_1 = $15_1 + 8 | 0;
                                        $19_1 = $19_1 + -1 | 0;
                                        $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
                                        $7_1 = $7_1 + 1 | 0;
                                       }
                                       $22_1 = $5_1 + 1 | 0;
                                       HEAP32[($4_1 + 108 | 0) >> 2] = $22_1;
                                       HEAP16[(($4_1 + ((HEAPU16[(($5_1 << 1 | 0) + 72144 | 0) >> 1] | 0) << 1 | 0) | 0) + 116 | 0) >> 1] = $16_1 & 7 | 0;
                                       $15_1 = $23_1 + -3 | 0;
                                       $16_1 = $16_1 >>> 3 | 0;
                                       $5_1 = $22_1;
                                       if (($5_1 | 0) != ($24_1 | 0)) {
                                        continue label$148
                                       }
                                       break label$148;
                                      };
                                      $5_1 = $24_1;
                                     }
                                     label$151 : {
                                      if ($5_1 >>> 0 > 18 >>> 0) {
                                       break label$151
                                      }
                                      $22_1 = $5_1;
                                      $23_1 = 0;
                                      label$152 : {
                                       $24_1 = (3 - $5_1 | 0) & 3 | 0;
                                       if (!$24_1) {
                                        break label$152
                                       }
                                       label$153 : while (1) {
                                        HEAP16[(($4_1 + ((HEAPU16[(($22_1 << 1 | 0) + 72144 | 0) >> 1] | 0) << 1 | 0) | 0) + 116 | 0) >> 1] = 0;
                                        $22_1 = $22_1 + 1 | 0;
                                        $23_1 = $23_1 + 1 | 0;
                                        if (($23_1 | 0) != ($24_1 | 0)) {
                                         continue label$153
                                        }
                                        break label$153;
                                       };
                                      }
                                      label$154 : {
                                       if (($5_1 + -16 | 0) >>> 0 < 3 >>> 0) {
                                        break label$154
                                       }
                                       label$155 : while (1) {
                                        $5_1 = $4_1 + 116 | 0;
                                        $23_1 = $22_1 << 1 | 0;
                                        HEAP16[($5_1 + ((HEAPU16[($23_1 + 72144 | 0) >> 1] | 0) << 1 | 0) | 0) >> 1] = 0;
                                        HEAP16[($5_1 + ((HEAPU16[($23_1 + 72146 | 0) >> 1] | 0) << 1 | 0) | 0) >> 1] = 0;
                                        HEAP16[($5_1 + ((HEAPU16[($23_1 + 72148 | 0) >> 1] | 0) << 1 | 0) | 0) >> 1] = 0;
                                        HEAP16[($5_1 + ((HEAPU16[($23_1 + 72150 | 0) >> 1] | 0) << 1 | 0) | 0) >> 1] = 0;
                                        $22_1 = $22_1 + 4 | 0;
                                        if (($22_1 | 0) != (19 | 0)) {
                                         continue label$155
                                        }
                                        break label$155;
                                       };
                                      }
                                      HEAP32[($4_1 + 108 | 0) >> 2] = 19;
                                     }
                                     HEAP32[($4_1 + 88 | 0) >> 2] = 7;
                                     HEAP32[($4_1 + 80 | 0) >> 2] = $14_1;
                                     HEAP32[($4_1 + 112 | 0) >> 2] = $14_1;
                                     $23_1 = 0;
                                     label$156 : {
                                      $17_1 = $21(0 | 0, $11_1 | 0, 19 | 0, $13_1 | 0, $12_1 | 0, $10_1 | 0) | 0;
                                      if (!$17_1) {
                                       break label$156
                                      }
                                      HEAP32[($0_1 + 24 | 0) >> 2] = 65588;
                                      HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                      $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                      continue label$8;
                                     }
                                     HEAP32[($4_1 + 4 | 0) >> 2] = 16198;
                                     HEAP32[($4_1 + 108 | 0) >> 2] = 0;
                                     $17_1 = 0;
                                    }
                                    label$157 : {
                                     $26_1 = HEAP32[($4_1 + 100 | 0) >> 2] | 0;
                                     $27_1 = (HEAP32[($4_1 + 104 | 0) >> 2] | 0) + $26_1 | 0;
                                     if ($23_1 >>> 0 >= $27_1 >>> 0) {
                                      break label$157
                                     }
                                     $28_1 = (-1 << (HEAP32[($4_1 + 88 | 0) >> 2] | 0) | 0) ^ -1 | 0;
                                     $29_1 = HEAP32[($4_1 + 80 | 0) >> 2] | 0;
                                     label$158 : while (1) {
                                      $25_1 = $15_1;
                                      $5_1 = $19_1;
                                      $22_1 = $7_1;
                                      label$159 : {
                                       label$160 : {
                                        label$161 : {
                                         label$162 : {
                                          label$163 : {
                                           label$164 : {
                                            label$165 : {
                                             $30_1 = $16_1 & $28_1 | 0;
                                             $31_1 = HEAPU8[(($29_1 + ($30_1 << 2 | 0) | 0) + 1 | 0) >> 0] | 0;
                                             if ($15_1 >>> 0 < $31_1 >>> 0) {
                                              break label$165
                                             }
                                             $22_1 = $7_1;
                                             $5_1 = $19_1;
                                             $24_1 = $15_1;
                                             break label$164;
                                            }
                                            label$166 : while (1) {
                                             if (!$5_1) {
                                              break label$163
                                             }
                                             $31_1 = (HEAPU8[$22_1 >> 0] | 0) << $25_1 | 0;
                                             $22_1 = $22_1 + 1 | 0;
                                             $5_1 = $5_1 + -1 | 0;
                                             $24_1 = $25_1 + 8 | 0;
                                             $25_1 = $24_1;
                                             $16_1 = $31_1 + $16_1 | 0;
                                             $30_1 = $16_1 & $28_1 | 0;
                                             $31_1 = HEAPU8[(($29_1 + ($30_1 << 2 | 0) | 0) + 1 | 0) >> 0] | 0;
                                             if ($24_1 >>> 0 < $31_1 >>> 0) {
                                              continue label$166
                                             }
                                             break label$166;
                                            };
                                           }
                                           label$167 : {
                                            $19_1 = HEAPU16[(($29_1 + ($30_1 << 2 | 0) | 0) + 2 | 0) >> 1] | 0;
                                            if ($19_1 >>> 0 > 15 >>> 0) {
                                             break label$167
                                            }
                                            $7_1 = $23_1 + 1 | 0;
                                            HEAP32[($4_1 + 108 | 0) >> 2] = $7_1;
                                            HEAP16[(($4_1 + ($23_1 << 1 | 0) | 0) + 116 | 0) >> 1] = $19_1;
                                            $15_1 = $24_1 - $31_1 | 0;
                                            $16_1 = $16_1 >>> $31_1 | 0;
                                            $23_1 = $7_1;
                                            break label$159;
                                           }
                                           label$168 : {
                                            label$169 : {
                                             label$170 : {
                                              switch ($19_1 + -16 | 0 | 0) {
                                              case 0:
                                               label$173 : {
                                                $19_1 = $31_1 + 2 | 0;
                                                if ($24_1 >>> 0 >= $19_1 >>> 0) {
                                                 break label$173
                                                }
                                                label$174 : while (1) {
                                                 if (!$5_1) {
                                                  break label$19
                                                 }
                                                 $5_1 = $5_1 + -1 | 0;
                                                 $16_1 = ((HEAPU8[$22_1 >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
                                                 $22_1 = $22_1 + 1 | 0;
                                                 $24_1 = $24_1 + 8 | 0;
                                                 if ($24_1 >>> 0 < $19_1 >>> 0) {
                                                  continue label$174
                                                 }
                                                 break label$174;
                                                };
                                               }
                                               $15_1 = $24_1 - $31_1 | 0;
                                               $24_1 = $16_1 >>> $31_1 | 0;
                                               label$175 : {
                                                if ($23_1) {
                                                 break label$175
                                                }
                                                HEAP32[($0_1 + 24 | 0) >> 2] = 65660;
                                                HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                                $7_1 = $22_1;
                                                $19_1 = $5_1;
                                                $16_1 = $24_1;
                                                $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                                continue label$8;
                                               }
                                               $15_1 = $15_1 + -2 | 0;
                                               $16_1 = $24_1 >>> 2 | 0;
                                               $31_1 = ($24_1 & 3 | 0) + 3 | 0;
                                               $19_1 = HEAPU16[((($23_1 << 1 | 0) + $4_1 | 0) + 114 | 0) >> 1] | 0;
                                               break label$168;
                                              case 1:
                                               label$176 : {
                                                $19_1 = $31_1 + 3 | 0;
                                                if ($24_1 >>> 0 >= $19_1 >>> 0) {
                                                 break label$176
                                                }
                                                label$177 : while (1) {
                                                 if (!$5_1) {
                                                  break label$19
                                                 }
                                                 $5_1 = $5_1 + -1 | 0;
                                                 $16_1 = ((HEAPU8[$22_1 >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
                                                 $22_1 = $22_1 + 1 | 0;
                                                 $24_1 = $24_1 + 8 | 0;
                                                 if ($24_1 >>> 0 < $19_1 >>> 0) {
                                                  continue label$177
                                                 }
                                                 break label$177;
                                                };
                                               }
                                               $15_1 = ($24_1 - $31_1 | 0) + -3 | 0;
                                               $19_1 = $16_1 >>> $31_1 | 0;
                                               $16_1 = $19_1 >>> 3 | 0;
                                               $31_1 = ($19_1 & 7 | 0) + 3 | 0;
                                               break label$169;
                                              default:
                                               break label$170;
                                              };
                                             }
                                             label$178 : {
                                              $19_1 = $31_1 + 7 | 0;
                                              if ($24_1 >>> 0 >= $19_1 >>> 0) {
                                               break label$178
                                              }
                                              label$179 : while (1) {
                                               if (!$5_1) {
                                                break label$19
                                               }
                                               $5_1 = $5_1 + -1 | 0;
                                               $16_1 = ((HEAPU8[$22_1 >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
                                               $22_1 = $22_1 + 1 | 0;
                                               $24_1 = $24_1 + 8 | 0;
                                               if ($24_1 >>> 0 < $19_1 >>> 0) {
                                                continue label$179
                                               }
                                               break label$179;
                                              };
                                             }
                                             $15_1 = ($24_1 - $31_1 | 0) + -7 | 0;
                                             $19_1 = $16_1 >>> $31_1 | 0;
                                             $16_1 = $19_1 >>> 7 | 0;
                                             $31_1 = ($19_1 & 127 | 0) + 11 | 0;
                                            }
                                            $19_1 = 0;
                                           }
                                           if (($31_1 + $23_1 | 0) >>> 0 > $27_1 >>> 0) {
                                            break label$161
                                           }
                                           $24_1 = 0;
                                           $25_1 = $31_1 & 3 | 0;
                                           if (!$25_1) {
                                            break label$162
                                           }
                                           $7_1 = $31_1;
                                           label$180 : while (1) {
                                            HEAP16[(($4_1 + ($23_1 << 1 | 0) | 0) + 116 | 0) >> 1] = $19_1;
                                            $23_1 = $23_1 + 1 | 0;
                                            $7_1 = $7_1 + -1 | 0;
                                            $24_1 = $24_1 + 1 | 0;
                                            if (($24_1 | 0) != ($25_1 | 0)) {
                                             continue label$180
                                            }
                                            break label$160;
                                           };
                                          }
                                          $7_1 = $7_1 + $19_1 | 0;
                                          $15_1 = $15_1 + ($19_1 << 3 | 0) | 0;
                                          break label$6;
                                         }
                                         $7_1 = $31_1;
                                         break label$160;
                                        }
                                        HEAP32[($0_1 + 24 | 0) >> 2] = 65660;
                                        HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                        $7_1 = $22_1;
                                        $19_1 = $5_1;
                                        $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                        continue label$8;
                                       }
                                       label$181 : {
                                        if ($31_1 >>> 0 < 4 >>> 0) {
                                         break label$181
                                        }
                                        label$182 : while (1) {
                                         $24_1 = $4_1 + ($23_1 << 1 | 0) | 0;
                                         HEAP16[($24_1 + 118 | 0) >> 1] = $19_1;
                                         HEAP16[($24_1 + 116 | 0) >> 1] = $19_1;
                                         HEAP16[($24_1 + 120 | 0) >> 1] = $19_1;
                                         HEAP16[($24_1 + 122 | 0) >> 1] = $19_1;
                                         $23_1 = $23_1 + 4 | 0;
                                         $7_1 = $7_1 + -4 | 0;
                                         if ($7_1) {
                                          continue label$182
                                         }
                                         break label$182;
                                        };
                                       }
                                       HEAP32[($4_1 + 108 | 0) >> 2] = $23_1;
                                      }
                                      $7_1 = $22_1;
                                      $19_1 = $5_1;
                                      if ($23_1 >>> 0 < $27_1 >>> 0) {
                                       continue label$158
                                      }
                                      break label$158;
                                     };
                                    }
                                    label$183 : {
                                     if (HEAPU16[($4_1 + 628 | 0) >> 1] | 0) {
                                      break label$183
                                     }
                                     HEAP32[($0_1 + 24 | 0) >> 2] = 65751;
                                     HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                     $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                     continue label$8;
                                    }
                                    HEAP32[($4_1 + 88 | 0) >> 2] = 9;
                                    HEAP32[($4_1 + 80 | 0) >> 2] = $14_1;
                                    HEAP32[($4_1 + 112 | 0) >> 2] = $14_1;
                                    label$184 : {
                                     $17_1 = $21(1 | 0, $11_1 | 0, $26_1 | 0, $13_1 | 0, $12_1 | 0, $10_1 | 0) | 0;
                                     if (!$17_1) {
                                      break label$184
                                     }
                                     HEAP32[($0_1 + 24 | 0) >> 2] = 65560;
                                     HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                     $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                     continue label$8;
                                    }
                                    HEAP32[($4_1 + 92 | 0) >> 2] = 6;
                                    HEAP32[($4_1 + 84 | 0) >> 2] = HEAP32[($4_1 + 112 | 0) >> 2] | 0;
                                    label$185 : {
                                     $17_1 = $21(2 | 0, $11_1 + ((HEAP32[($4_1 + 100 | 0) >> 2] | 0) << 1 | 0) | 0 | 0, HEAP32[($4_1 + 104 | 0) >> 2] | 0 | 0, $13_1 | 0, $9_1 | 0, $10_1 | 0) | 0;
                                     if (!$17_1) {
                                      break label$185
                                     }
                                     HEAP32[($0_1 + 24 | 0) >> 2] = 65638;
                                     HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                     $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                     continue label$8;
                                    }
                                    HEAP32[($4_1 + 4 | 0) >> 2] = 16199;
                                    $17_1 = 0;
                                    if (($1_1 | 0) != (6 | 0)) {
                                     break label$36
                                    }
                                    $22_1 = 0;
                                    break label$5;
                                   }
                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16200;
                                  }
                                  label$186 : {
                                   if ($19_1 >>> 0 < 6 >>> 0) {
                                    break label$186
                                   }
                                   if ($20_1 >>> 0 < 258 >>> 0) {
                                    break label$186
                                   }
                                   HEAP32[($0_1 + 16 | 0) >> 2] = $20_1;
                                   HEAP32[($0_1 + 12 | 0) >> 2] = $6_1;
                                   HEAP32[($0_1 + 4 | 0) >> 2] = $19_1;
                                   HEAP32[$0_1 >> 2] = $7_1;
                                   HEAP32[($4_1 + 64 | 0) >> 2] = $15_1;
                                   HEAP32[($4_1 + 60 | 0) >> 2] = $16_1;
                                   $15($0_1 | 0, $21_1 | 0);
                                   $15_1 = HEAP32[($4_1 + 64 | 0) >> 2] | 0;
                                   $16_1 = HEAP32[($4_1 + 60 | 0) >> 2] | 0;
                                   $19_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
                                   $7_1 = HEAP32[$0_1 >> 2] | 0;
                                   $20_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
                                   $6_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
                                   if ((HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 0) != (16191 | 0)) {
                                    break label$20
                                   }
                                   HEAP32[($4_1 + 7112 | 0) >> 2] = -1;
                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                   continue label$8;
                                  }
                                  HEAP32[($4_1 + 7112 | 0) >> 2] = 0;
                                  $23_1 = $15_1;
                                  $5_1 = $19_1;
                                  $22_1 = $7_1;
                                  label$187 : {
                                   label$188 : {
                                    $31_1 = HEAP32[($4_1 + 80 | 0) >> 2] | 0;
                                    $30_1 = (-1 << (HEAP32[($4_1 + 88 | 0) >> 2] | 0) | 0) ^ -1 | 0;
                                    $29_1 = $31_1 + (($16_1 & $30_1 | 0) << 2 | 0) | 0;
                                    $25_1 = HEAPU8[($29_1 + 1 | 0) >> 0] | 0;
                                    if ($15_1 >>> 0 < $25_1 >>> 0) {
                                     break label$188
                                    }
                                    $22_1 = $7_1;
                                    $5_1 = $19_1;
                                    $24_1 = $15_1;
                                    break label$187;
                                   }
                                   label$189 : while (1) {
                                    if (!$5_1) {
                                     break label$23
                                    }
                                    $25_1 = (HEAPU8[$22_1 >> 0] | 0) << $23_1 | 0;
                                    $22_1 = $22_1 + 1 | 0;
                                    $5_1 = $5_1 + -1 | 0;
                                    $24_1 = $23_1 + 8 | 0;
                                    $23_1 = $24_1;
                                    $16_1 = $25_1 + $16_1 | 0;
                                    $29_1 = $31_1 + (($16_1 & $30_1 | 0) << 2 | 0) | 0;
                                    $25_1 = HEAPU8[($29_1 + 1 | 0) >> 0] | 0;
                                    if ($23_1 >>> 0 < $25_1 >>> 0) {
                                     continue label$189
                                    }
                                    break label$189;
                                   };
                                  }
                                  $15_1 = $25_1;
                                  $30_1 = HEAPU16[($29_1 + 2 | 0) >> 1] | 0;
                                  label$190 : {
                                   label$191 : {
                                    $29_1 = HEAPU8[$29_1 >> 0] | 0;
                                    if ((($29_1 + -1 | 0) & 255 | 0) >>> 0 <= 14 >>> 0) {
                                     break label$191
                                    }
                                    $15_1 = 0;
                                    $7_1 = $22_1;
                                    $19_1 = $5_1;
                                    break label$190;
                                   }
                                   $23_1 = $24_1;
                                   $19_1 = $5_1;
                                   $7_1 = $22_1;
                                   label$192 : {
                                    label$193 : {
                                     $27_1 = (-1 << ($15_1 + $29_1 | 0) | 0) ^ -1 | 0;
                                     $28_1 = $31_1 + (((($16_1 & $27_1 | 0) >>> $15_1 | 0) + $30_1 | 0) << 2 | 0) | 0;
                                     $25_1 = HEAPU8[($28_1 + 1 | 0) >> 0] | 0;
                                     if (($15_1 + $25_1 | 0) >>> 0 > $23_1 >>> 0) {
                                      break label$193
                                     }
                                     $7_1 = $22_1;
                                     $19_1 = $5_1;
                                     $29_1 = $24_1;
                                     break label$192;
                                    }
                                    label$194 : while (1) {
                                     if (!$19_1) {
                                      break label$24
                                     }
                                     $25_1 = (HEAPU8[$7_1 >> 0] | 0) << $23_1 | 0;
                                     $7_1 = $7_1 + 1 | 0;
                                     $19_1 = $19_1 + -1 | 0;
                                     $29_1 = $23_1 + 8 | 0;
                                     $23_1 = $29_1;
                                     $16_1 = $25_1 + $16_1 | 0;
                                     $28_1 = $31_1 + (((($16_1 & $27_1 | 0) >>> $15_1 | 0) + $30_1 | 0) << 2 | 0) | 0;
                                     $25_1 = HEAPU8[($28_1 + 1 | 0) >> 0] | 0;
                                     if (($15_1 + $25_1 | 0) >>> 0 > $23_1 >>> 0) {
                                      continue label$194
                                     }
                                     break label$194;
                                    };
                                   }
                                   $24_1 = $29_1 - $15_1 | 0;
                                   $16_1 = $16_1 >>> $15_1 | 0;
                                   $29_1 = HEAPU8[$28_1 >> 0] | 0;
                                   $30_1 = HEAPU16[($28_1 + 2 | 0) >> 1] | 0;
                                  }
                                  HEAP32[($4_1 + 68 | 0) >> 2] = $30_1 & 65535 | 0;
                                  HEAP32[($4_1 + 7112 | 0) >> 2] = $15_1 + $25_1 | 0;
                                  $15_1 = $24_1 - $25_1 | 0;
                                  $16_1 = $16_1 >>> $25_1 | 0;
                                  label$195 : {
                                   $5_1 = $29_1 & 255 | 0;
                                   if ($5_1) {
                                    break label$195
                                   }
                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16205;
                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                   continue label$8;
                                  }
                                  label$196 : {
                                   if (!($5_1 & 32 | 0)) {
                                    break label$196
                                   }
                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16191;
                                   HEAP32[($4_1 + 7112 | 0) >> 2] = -1;
                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                   continue label$8;
                                  }
                                  label$197 : {
                                   if (!($5_1 & 64 | 0)) {
                                    break label$197
                                   }
                                   HEAP32[($0_1 + 24 | 0) >> 2] = 65944;
                                   HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                   continue label$8;
                                  }
                                  HEAP32[($4_1 + 4 | 0) >> 2] = 16201;
                                  $23_1 = $5_1 & 15 | 0;
                                  HEAP32[($4_1 + 76 | 0) >> 2] = $23_1;
                                 }
                                 $25_1 = $7_1;
                                 $24_1 = $19_1;
                                 label$198 : {
                                  label$199 : {
                                   if ($23_1) {
                                    break label$199
                                   }
                                   $22_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                                   $7_1 = $25_1;
                                   $19_1 = $24_1;
                                   break label$198;
                                  }
                                  $5_1 = $15_1;
                                  $19_1 = $24_1;
                                  $22_1 = $25_1;
                                  label$200 : {
                                   label$201 : {
                                    if ($5_1 >>> 0 < $23_1 >>> 0) {
                                     break label$201
                                    }
                                    $7_1 = $25_1;
                                    $19_1 = $24_1;
                                    $5_1 = $15_1;
                                    break label$200;
                                   }
                                   label$202 : while (1) {
                                    if (!$19_1) {
                                     break label$25
                                    }
                                    $19_1 = $19_1 + -1 | 0;
                                    $16_1 = ((HEAPU8[$22_1 >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                    $7_1 = $22_1 + 1 | 0;
                                    $22_1 = $7_1;
                                    $5_1 = $5_1 + 8 | 0;
                                    if ($5_1 >>> 0 < $23_1 >>> 0) {
                                     continue label$202
                                    }
                                    break label$202;
                                   };
                                  }
                                  HEAP32[($4_1 + 7112 | 0) >> 2] = (HEAP32[($4_1 + 7112 | 0) >> 2] | 0) + $23_1 | 0;
                                  $22_1 = (HEAP32[($4_1 + 68 | 0) >> 2] | 0) + ($16_1 & ((-1 << $23_1 | 0) ^ -1 | 0) | 0) | 0;
                                  HEAP32[($4_1 + 68 | 0) >> 2] = $22_1;
                                  $15_1 = $5_1 - $23_1 | 0;
                                  $16_1 = $16_1 >>> $23_1 | 0;
                                 }
                                 HEAP32[($4_1 + 4 | 0) >> 2] = 16202;
                                 HEAP32[($4_1 + 7116 | 0) >> 2] = $22_1;
                                }
                                $23_1 = $15_1;
                                $5_1 = $19_1;
                                $22_1 = $7_1;
                                label$203 : {
                                 label$204 : {
                                  $31_1 = HEAP32[($4_1 + 84 | 0) >> 2] | 0;
                                  $30_1 = (-1 << (HEAP32[($4_1 + 92 | 0) >> 2] | 0) | 0) ^ -1 | 0;
                                  $29_1 = $31_1 + (($16_1 & $30_1 | 0) << 2 | 0) | 0;
                                  $25_1 = HEAPU8[($29_1 + 1 | 0) >> 0] | 0;
                                  if ($15_1 >>> 0 < $25_1 >>> 0) {
                                   break label$204
                                  }
                                  $22_1 = $7_1;
                                  $5_1 = $19_1;
                                  $24_1 = $15_1;
                                  break label$203;
                                 }
                                 label$205 : while (1) {
                                  if (!$5_1) {
                                   break label$26
                                  }
                                  $25_1 = (HEAPU8[$22_1 >> 0] | 0) << $23_1 | 0;
                                  $22_1 = $22_1 + 1 | 0;
                                  $5_1 = $5_1 + -1 | 0;
                                  $24_1 = $23_1 + 8 | 0;
                                  $23_1 = $24_1;
                                  $16_1 = $25_1 + $16_1 | 0;
                                  $29_1 = $31_1 + (($16_1 & $30_1 | 0) << 2 | 0) | 0;
                                  $25_1 = HEAPU8[($29_1 + 1 | 0) >> 0] | 0;
                                  if ($23_1 >>> 0 < $25_1 >>> 0) {
                                   continue label$205
                                  }
                                  break label$205;
                                 };
                                }
                                $30_1 = HEAPU16[($29_1 + 2 | 0) >> 1] | 0;
                                label$206 : {
                                 label$207 : {
                                  $23_1 = HEAPU8[$29_1 >> 0] | 0;
                                  if ($23_1 >>> 0 < 16 >>> 0) {
                                   break label$207
                                  }
                                  $15_1 = HEAP32[($4_1 + 7112 | 0) >> 2] | 0;
                                  $7_1 = $22_1;
                                  $19_1 = $5_1;
                                  $29_1 = $25_1;
                                  break label$206;
                                 }
                                 $15_1 = $24_1;
                                 $19_1 = $5_1;
                                 $7_1 = $22_1;
                                 label$208 : {
                                  label$209 : {
                                   $27_1 = (-1 << ($25_1 + $23_1 | 0) | 0) ^ -1 | 0;
                                   $28_1 = $31_1 + (((($16_1 & $27_1 | 0) >>> $25_1 | 0) + $30_1 | 0) << 2 | 0) | 0;
                                   $29_1 = HEAPU8[($28_1 + 1 | 0) >> 0] | 0;
                                   if (($25_1 + $29_1 | 0) >>> 0 > $15_1 >>> 0) {
                                    break label$209
                                   }
                                   $7_1 = $22_1;
                                   $19_1 = $5_1;
                                   $23_1 = $24_1;
                                   break label$208;
                                  }
                                  label$210 : while (1) {
                                   if (!$19_1) {
                                    break label$27
                                   }
                                   $29_1 = (HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0;
                                   $7_1 = $7_1 + 1 | 0;
                                   $19_1 = $19_1 + -1 | 0;
                                   $23_1 = $15_1 + 8 | 0;
                                   $15_1 = $23_1;
                                   $16_1 = $29_1 + $16_1 | 0;
                                   $28_1 = $31_1 + (((($16_1 & $27_1 | 0) >>> $25_1 | 0) + $30_1 | 0) << 2 | 0) | 0;
                                   $29_1 = HEAPU8[($28_1 + 1 | 0) >> 0] | 0;
                                   if (($25_1 + $29_1 | 0) >>> 0 > $15_1 >>> 0) {
                                    continue label$210
                                   }
                                   break label$210;
                                  };
                                 }
                                 $24_1 = $23_1 - $25_1 | 0;
                                 $16_1 = $16_1 >>> $25_1 | 0;
                                 $15_1 = (HEAP32[($4_1 + 7112 | 0) >> 2] | 0) + $25_1 | 0;
                                 $23_1 = HEAPU8[$28_1 >> 0] | 0;
                                 $30_1 = HEAPU16[($28_1 + 2 | 0) >> 1] | 0;
                                }
                                HEAP32[($4_1 + 7112 | 0) >> 2] = $15_1 + $29_1 | 0;
                                $15_1 = $24_1 - $29_1 | 0;
                                $16_1 = $16_1 >>> $29_1 | 0;
                                label$211 : {
                                 if (!($23_1 & 64 | 0)) {
                                  break label$211
                                 }
                                 HEAP32[($0_1 + 24 | 0) >> 2] = 65972;
                                 HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                                 $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                                 continue label$8;
                                }
                                HEAP32[($4_1 + 4 | 0) >> 2] = 16203;
                                $23_1 = ($23_1 & 255 | 0) & 15 | 0;
                                HEAP32[($4_1 + 76 | 0) >> 2] = $23_1;
                                HEAP32[($4_1 + 72 | 0) >> 2] = $30_1 & 65535 | 0;
                               }
                               $25_1 = $7_1;
                               $24_1 = $19_1;
                               label$212 : {
                                label$213 : {
                                 if ($23_1) {
                                  break label$213
                                 }
                                 $7_1 = $25_1;
                                 $19_1 = $24_1;
                                 break label$212;
                                }
                                $5_1 = $15_1;
                                $19_1 = $24_1;
                                $22_1 = $25_1;
                                label$214 : {
                                 label$215 : {
                                  if ($5_1 >>> 0 < $23_1 >>> 0) {
                                   break label$215
                                  }
                                  $7_1 = $25_1;
                                  $19_1 = $24_1;
                                  $5_1 = $15_1;
                                  break label$214;
                                 }
                                 label$216 : while (1) {
                                  if (!$19_1) {
                                   break label$28
                                  }
                                  $19_1 = $19_1 + -1 | 0;
                                  $16_1 = ((HEAPU8[$22_1 >> 0] | 0) << $5_1 | 0) + $16_1 | 0;
                                  $7_1 = $22_1 + 1 | 0;
                                  $22_1 = $7_1;
                                  $5_1 = $5_1 + 8 | 0;
                                  if ($5_1 >>> 0 < $23_1 >>> 0) {
                                   continue label$216
                                  }
                                  break label$216;
                                 };
                                }
                                HEAP32[($4_1 + 7112 | 0) >> 2] = (HEAP32[($4_1 + 7112 | 0) >> 2] | 0) + $23_1 | 0;
                                HEAP32[($4_1 + 72 | 0) >> 2] = (HEAP32[($4_1 + 72 | 0) >> 2] | 0) + ($16_1 & ((-1 << $23_1 | 0) ^ -1 | 0) | 0) | 0;
                                $15_1 = $5_1 - $23_1 | 0;
                                $16_1 = $16_1 >>> $23_1 | 0;
                               }
                               HEAP32[($4_1 + 4 | 0) >> 2] = 16204;
                              }
                              if ($20_1) {
                               break label$29
                              }
                             }
                             $20_1 = 0;
                             break label$11;
                            }
                            label$217 : {
                             label$218 : {
                              $5_1 = HEAP32[($4_1 + 72 | 0) >> 2] | 0;
                              $22_1 = $21_1 - $20_1 | 0;
                              if ($5_1 >>> 0 <= $22_1 >>> 0) {
                               break label$218
                              }
                              label$219 : {
                               $22_1 = $5_1 - $22_1 | 0;
                               if ($22_1 >>> 0 <= (HEAP32[($4_1 + 48 | 0) >> 2] | 0) >>> 0) {
                                break label$219
                               }
                               if (!(HEAP32[($4_1 + 7108 | 0) >> 2] | 0)) {
                                break label$219
                               }
                               HEAP32[($0_1 + 24 | 0) >> 2] = 65855;
                               HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
                               $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                               continue label$8;
                              }
                              label$220 : {
                               label$221 : {
                                $5_1 = HEAP32[($4_1 + 52 | 0) >> 2] | 0;
                                if ($22_1 >>> 0 <= $5_1 >>> 0) {
                                 break label$221
                                }
                                $22_1 = $22_1 - $5_1 | 0;
                                $5_1 = (HEAP32[($4_1 + 56 | 0) >> 2] | 0) + ((HEAP32[($4_1 + 44 | 0) >> 2] | 0) - $22_1 | 0) | 0;
                                break label$220;
                               }
                               $5_1 = (HEAP32[($4_1 + 56 | 0) >> 2] | 0) + ($5_1 - $22_1 | 0) | 0;
                              }
                              $23_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                              $22_1 = $22_1 >>> 0 < $23_1 >>> 0 ? $22_1 : $23_1;
                              break label$217;
                             }
                             $5_1 = $6_1 - $5_1 | 0;
                             $23_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                             $22_1 = $23_1;
                            }
                            $25_1 = $22_1 >>> 0 < $20_1 >>> 0 ? $22_1 : $20_1;
                            HEAP32[($4_1 + 68 | 0) >> 2] = $23_1 - $25_1 | 0;
                            $31_1 = $25_1 + -1 | 0;
                            $23_1 = 0;
                            $24_1 = $25_1 & 7 | 0;
                            if (!$24_1) {
                             break label$22
                            }
                            $22_1 = $25_1;
                            label$222 : while (1) {
                             HEAP8[$6_1 >> 0] = HEAPU8[$5_1 >> 0] | 0;
                             $22_1 = $22_1 + -1 | 0;
                             $6_1 = $6_1 + 1 | 0;
                             $5_1 = $5_1 + 1 | 0;
                             $23_1 = $23_1 + 1 | 0;
                             if (($23_1 | 0) != ($24_1 | 0)) {
                              continue label$222
                             }
                             break label$21;
                            };
                           }
                           $7_1 = $25_1 + $24_1 | 0;
                           $15_1 = $15_1 + ($24_1 << 3 | 0) | 0;
                           break label$6;
                          }
                          $7_1 = $22_1 + $5_1 | 0;
                          $15_1 = $24_1 + ($5_1 << 3 | 0) | 0;
                          break label$6;
                         }
                         $15_1 = $15_1 + ($19_1 << 3 | 0) | 0;
                         $7_1 = $7_1 + $19_1 | 0;
                         break label$6;
                        }
                        $15_1 = $15_1 + ($24_1 << 3 | 0) | 0;
                        $7_1 = $25_1 + $24_1 | 0;
                        break label$6;
                       }
                       $15_1 = $24_1 + ($5_1 << 3 | 0) | 0;
                       $7_1 = $22_1 + $5_1 | 0;
                       break label$6;
                      }
                      $15_1 = $15_1 + ($19_1 << 3 | 0) | 0;
                      $7_1 = $7_1 + $19_1 | 0;
                      break label$6;
                     }
                     $22_1 = $25_1;
                    }
                    label$223 : {
                     if ($31_1 >>> 0 < 7 >>> 0) {
                      break label$223
                     }
                     label$224 : while (1) {
                      HEAP8[$6_1 >> 0] = HEAPU8[$5_1 >> 0] | 0;
                      HEAP8[($6_1 + 1 | 0) >> 0] = HEAPU8[($5_1 + 1 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 2 | 0) >> 0] = HEAPU8[($5_1 + 2 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 3 | 0) >> 0] = HEAPU8[($5_1 + 3 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 4 | 0) >> 0] = HEAPU8[($5_1 + 4 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 5 | 0) >> 0] = HEAPU8[($5_1 + 5 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 6 | 0) >> 0] = HEAPU8[($5_1 + 6 | 0) >> 0] | 0;
                      HEAP8[($6_1 + 7 | 0) >> 0] = HEAPU8[($5_1 + 7 | 0) >> 0] | 0;
                      $6_1 = $6_1 + 8 | 0;
                      $5_1 = $5_1 + 8 | 0;
                      $22_1 = $22_1 + -8 | 0;
                      if ($22_1) {
                       continue label$224
                      }
                      break label$224;
                     };
                    }
                    $20_1 = $20_1 - $25_1 | 0;
                    if (HEAP32[($4_1 + 68 | 0) >> 2] | 0) {
                     break label$20
                    }
                    HEAP32[($4_1 + 4 | 0) >> 2] = 16200;
                    $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                    continue label$8;
                   }
                   $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
                   continue label$8;
                  }
                  $19_1 = 0;
                  $7_1 = $22_1;
                  $15_1 = $24_1;
                  $22_1 = $17_1;
                  break label$5;
                 }
                 label$225 : {
                  $22_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                  if (!$22_1) {
                   break label$225
                  }
                  HEAP32[($22_1 + 16 | 0) >> 2] = 0;
                 }
                 $15_1 = $5_1;
                }
                HEAP32[($4_1 + 4 | 0) >> 2] = 16185;
               }
               label$226 : {
                $23_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
                if (!($23_1 & 1024 | 0)) {
                 break label$226
                }
                label$227 : {
                 $5_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                 $22_1 = $5_1 >>> 0 < $19_1 >>> 0 ? $5_1 : $19_1;
                 if (!$22_1) {
                  break label$227
                 }
                 label$228 : {
                  $24_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                  if (!$24_1) {
                   break label$228
                  }
                  $25_1 = HEAP32[($24_1 + 16 | 0) >> 2] | 0;
                  if (!$25_1) {
                   break label$228
                  }
                  $31_1 = HEAP32[($24_1 + 24 | 0) >> 2] | 0;
                  $5_1 = (HEAP32[($24_1 + 20 | 0) >> 2] | 0) - $5_1 | 0;
                  if ($31_1 >>> 0 <= $5_1 >>> 0) {
                   break label$228
                  }
                  $24($25_1 + $5_1 | 0 | 0, $7_1 | 0, (($5_1 + $22_1 | 0) >>> 0 > $31_1 >>> 0 ? $31_1 - $5_1 | 0 : $22_1) | 0) | 0;
                  $23_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
                 }
                 label$229 : {
                  if (!($23_1 & 512 | 0)) {
                   break label$229
                  }
                  if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                   break label$229
                  }
                  HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $7_1 | 0, $22_1 | 0) | 0;
                 }
                 $5_1 = (HEAP32[($4_1 + 68 | 0) >> 2] | 0) - $22_1 | 0;
                 HEAP32[($4_1 + 68 | 0) >> 2] = $5_1;
                 $7_1 = $7_1 + $22_1 | 0;
                 $19_1 = $19_1 - $22_1 | 0;
                }
                if ($5_1) {
                 break label$11
                }
               }
               HEAP32[($4_1 + 4 | 0) >> 2] = 16186;
               HEAP32[($4_1 + 68 | 0) >> 2] = 0;
              }
              label$230 : {
               label$231 : {
                if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 8 | 0)) {
                 break label$231
                }
                $5_1 = 0;
                if (!$19_1) {
                 break label$12
                }
                label$232 : while (1) {
                 $22_1 = HEAPU8[($7_1 + $5_1 | 0) >> 0] | 0;
                 label$233 : {
                  $23_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                  if (!$23_1) {
                   break label$233
                  }
                  $24_1 = HEAP32[($23_1 + 28 | 0) >> 2] | 0;
                  if (!$24_1) {
                   break label$233
                  }
                  $25_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                  if ($25_1 >>> 0 >= (HEAP32[($23_1 + 32 | 0) >> 2] | 0) >>> 0) {
                   break label$233
                  }
                  HEAP32[($4_1 + 68 | 0) >> 2] = $25_1 + 1 | 0;
                  HEAP8[($24_1 + $25_1 | 0) >> 0] = $22_1;
                 }
                 $5_1 = $5_1 + 1 | 0;
                 label$234 : {
                  if (!($22_1 & 255 | 0)) {
                   break label$234
                  }
                  if ($19_1 >>> 0 > $5_1 >>> 0) {
                   continue label$232
                  }
                 }
                 break label$232;
                };
                label$235 : {
                 if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 2 | 0)) {
                  break label$235
                 }
                 if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                  break label$235
                 }
                 HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $7_1 | 0, $5_1 | 0) | 0;
                }
                $7_1 = $7_1 + $5_1 | 0;
                $19_1 = $19_1 - $5_1 | 0;
                if (!($22_1 & 255 | 0)) {
                 break label$230
                }
                break label$11;
               }
               $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
               if (!$5_1) {
                break label$230
               }
               HEAP32[($5_1 + 28 | 0) >> 2] = 0;
              }
              HEAP32[($4_1 + 4 | 0) >> 2] = 16187;
              HEAP32[($4_1 + 68 | 0) >> 2] = 0;
             }
             label$236 : {
              label$237 : {
               if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 16 | 0)) {
                break label$237
               }
               $5_1 = 0;
               if (!$19_1) {
                break label$12
               }
               label$238 : while (1) {
                $22_1 = HEAPU8[($7_1 + $5_1 | 0) >> 0] | 0;
                label$239 : {
                 $23_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
                 if (!$23_1) {
                  break label$239
                 }
                 $24_1 = HEAP32[($23_1 + 36 | 0) >> 2] | 0;
                 if (!$24_1) {
                  break label$239
                 }
                 $25_1 = HEAP32[($4_1 + 68 | 0) >> 2] | 0;
                 if ($25_1 >>> 0 >= (HEAP32[($23_1 + 40 | 0) >> 2] | 0) >>> 0) {
                  break label$239
                 }
                 HEAP32[($4_1 + 68 | 0) >> 2] = $25_1 + 1 | 0;
                 HEAP8[($24_1 + $25_1 | 0) >> 0] = $22_1;
                }
                $5_1 = $5_1 + 1 | 0;
                label$240 : {
                 if (!($22_1 & 255 | 0)) {
                  break label$240
                 }
                 if ($19_1 >>> 0 > $5_1 >>> 0) {
                  continue label$238
                 }
                }
                break label$238;
               };
               label$241 : {
                if (!((HEAPU8[($4_1 + 21 | 0) >> 0] | 0) & 2 | 0)) {
                 break label$241
                }
                if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
                 break label$241
                }
                HEAP32[($4_1 + 28 | 0) >> 2] = $12(HEAP32[($4_1 + 28 | 0) >> 2] | 0 | 0, $7_1 | 0, $5_1 | 0) | 0;
               }
               $7_1 = $7_1 + $5_1 | 0;
               $19_1 = $19_1 - $5_1 | 0;
               if (!($22_1 & 255 | 0)) {
                break label$236
               }
               break label$11;
              }
              $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
              if (!$5_1) {
               break label$236
              }
              HEAP32[($5_1 + 36 | 0) >> 2] = 0;
             }
             HEAP32[($4_1 + 4 | 0) >> 2] = 16188;
            }
            label$242 : {
             $22_1 = HEAP32[($4_1 + 20 | 0) >> 2] | 0;
             if (!($22_1 & 512 | 0)) {
              break label$242
             }
             label$243 : {
              label$244 : {
               if ($15_1 >>> 0 <= 15 >>> 0) {
                break label$244
               }
               $5_1 = $7_1;
               break label$243;
              }
              if (!$19_1) {
               break label$6
              }
              $24_1 = $15_1 + 8 | 0;
              $5_1 = $7_1 + 1 | 0;
              $23_1 = $19_1 + -1 | 0;
              $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
              label$245 : {
               if ($15_1 >>> 0 <= 7 >>> 0) {
                break label$245
               }
               $19_1 = $23_1;
               $15_1 = $24_1;
               break label$243;
              }
              label$246 : {
               if ($23_1) {
                break label$246
               }
               $7_1 = $5_1;
               $19_1 = 0;
               $15_1 = $24_1;
               $22_1 = $17_1;
               break label$5;
              }
              $15_1 = $15_1 + 16 | 0;
              $5_1 = $7_1 + 2 | 0;
              $19_1 = $19_1 + -2 | 0;
              $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
             }
             label$247 : {
              if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
               break label$247
              }
              if (($16_1 | 0) == (HEAPU16[($4_1 + 28 | 0) >> 1] | 0 | 0)) {
               break label$247
              }
              HEAP32[($0_1 + 24 | 0) >> 2] = 65885;
              HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
              $7_1 = $5_1;
              $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
              continue label$8;
             }
             $7_1 = $5_1;
             $16_1 = 0;
             $15_1 = 0;
            }
            label$248 : {
             $5_1 = HEAP32[($4_1 + 36 | 0) >> 2] | 0;
             if (!$5_1) {
              break label$248
             }
             HEAP32[($5_1 + 48 | 0) >> 2] = 1;
             HEAP32[($5_1 + 44 | 0) >> 2] = ($22_1 >>> 9 | 0) & 1 | 0;
            }
            $5_1 = $12(0 | 0, 0 | 0, 0 | 0) | 0;
            HEAP32[($4_1 + 28 | 0) >> 2] = $5_1;
            HEAP32[($0_1 + 48 | 0) >> 2] = $5_1;
            HEAP32[($4_1 + 4 | 0) >> 2] = 16191;
            $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
            continue label$8;
           }
           $19_1 = 0;
          }
          $23_1 = $17_1;
         }
         $22_1 = $23_1;
         break label$5;
        }
        if (!$5_1) {
         break label$7
        }
        if (!(HEAP32[($4_1 + 20 | 0) >> 2] | 0)) {
         break label$7
        }
        label$249 : {
         label$250 : {
          if ($15_1 >>> 0 <= 31 >>> 0) {
           break label$250
          }
          $22_1 = $7_1;
          break label$249;
         }
         if (!$19_1) {
          break label$6
         }
         $24_1 = $15_1 + 8 | 0;
         $22_1 = $7_1 + 1 | 0;
         $23_1 = $19_1 + -1 | 0;
         $16_1 = ((HEAPU8[$7_1 >> 0] | 0) << $15_1 | 0) + $16_1 | 0;
         label$251 : {
          if ($15_1 >>> 0 <= 23 >>> 0) {
           break label$251
          }
          $19_1 = $23_1;
          $15_1 = $24_1;
          break label$249;
         }
         label$252 : {
          if ($23_1) {
           break label$252
          }
          $7_1 = $22_1;
          $19_1 = 0;
          $15_1 = $24_1;
          $22_1 = $17_1;
          break label$5;
         }
         $25_1 = $15_1 + 16 | 0;
         $22_1 = $7_1 + 2 | 0;
         $23_1 = $19_1 + -2 | 0;
         $16_1 = ((HEAPU8[($7_1 + 1 | 0) >> 0] | 0) << $24_1 | 0) + $16_1 | 0;
         label$253 : {
          if ($15_1 >>> 0 <= 15 >>> 0) {
           break label$253
          }
          $19_1 = $23_1;
          $15_1 = $25_1;
          break label$249;
         }
         label$254 : {
          if ($23_1) {
           break label$254
          }
          $7_1 = $22_1;
          $19_1 = 0;
          $15_1 = $25_1;
          $22_1 = $17_1;
          break label$5;
         }
         $23_1 = $15_1 + 24 | 0;
         $22_1 = $7_1 + 3 | 0;
         $24_1 = $19_1 + -3 | 0;
         $16_1 = ((HEAPU8[($7_1 + 2 | 0) >> 0] | 0) << $25_1 | 0) + $16_1 | 0;
         label$255 : {
          if ($15_1 >>> 0 <= 7 >>> 0) {
           break label$255
          }
          $19_1 = $24_1;
          $15_1 = $23_1;
          break label$249;
         }
         label$256 : {
          if ($24_1) {
           break label$256
          }
          $7_1 = $22_1;
          $19_1 = 0;
          $15_1 = $23_1;
          $22_1 = $17_1;
          break label$5;
         }
         $15_1 = $15_1 + 32 | 0;
         $22_1 = $7_1 + 4 | 0;
         $19_1 = $19_1 + -4 | 0;
         $16_1 = ((HEAPU8[($7_1 + 3 | 0) >> 0] | 0) << $23_1 | 0) + $16_1 | 0;
        }
        label$257 : {
         if (!($5_1 & 4 | 0)) {
          break label$257
         }
         if (($16_1 | 0) == (HEAP32[($4_1 + 32 | 0) >> 2] | 0 | 0)) {
          break label$257
         }
         HEAP32[($0_1 + 24 | 0) >> 2] = 65811;
         HEAP32[($4_1 + 4 | 0) >> 2] = 16209;
         $7_1 = $22_1;
         $5_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
         continue label$8;
        }
        break label$8;
       };
       $7_1 = $22_1;
       $16_1 = 0;
       $15_1 = 0;
      }
      HEAP32[($4_1 + 4 | 0) >> 2] = 16208;
      $22_1 = 1;
      break label$5;
     }
     $19_1 = 0;
     $22_1 = $17_1;
    }
    HEAP32[($0_1 + 16 | 0) >> 2] = $20_1;
    HEAP32[($0_1 + 12 | 0) >> 2] = $6_1;
    HEAP32[($0_1 + 4 | 0) >> 2] = $19_1;
    HEAP32[$0_1 >> 2] = $7_1;
    HEAP32[($4_1 + 64 | 0) >> 2] = $15_1;
    HEAP32[($4_1 + 60 | 0) >> 2] = $16_1;
    label$258 : {
     label$259 : {
      label$260 : {
       if (HEAP32[($4_1 + 44 | 0) >> 2] | 0) {
        break label$260
       }
       label$261 : {
        if (($21_1 | 0) != ($20_1 | 0)) {
         break label$261
        }
        $3_1 = $19_1;
        break label$259;
       }
       label$262 : {
        $3_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
        if ($3_1 >>> 0 <= 16208 >>> 0) {
         break label$262
        }
        $3_1 = $19_1;
        break label$259;
       }
       if (($1_1 | 0) != (4 | 0)) {
        break label$260
       }
       if ($3_1 >>> 0 <= 16205 >>> 0) {
        break label$260
       }
       $3_1 = $19_1;
       break label$259;
      }
      if ($19($0_1 | 0, $6_1 | 0, $21_1 - $20_1 | 0 | 0) | 0) {
       break label$258
      }
      $20_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
      $3_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
     }
     HEAP32[($0_1 + 8 | 0) >> 2] = ($18_1 - $3_1 | 0) + (HEAP32[($0_1 + 8 | 0) >> 2] | 0) | 0;
     $6_1 = $21_1 - $20_1 | 0;
     HEAP32[($0_1 + 20 | 0) >> 2] = (HEAP32[($0_1 + 20 | 0) >> 2] | 0) + $6_1 | 0;
     HEAP32[($4_1 + 32 | 0) >> 2] = (HEAP32[($4_1 + 32 | 0) >> 2] | 0) + $6_1 | 0;
     label$263 : {
      if (!((HEAPU8[($4_1 + 12 | 0) >> 0] | 0) & 4 | 0)) {
       break label$263
      }
      if (($21_1 | 0) == ($20_1 | 0)) {
       break label$263
      }
      $5_1 = (HEAP32[($0_1 + 12 | 0) >> 2] | 0) - $6_1 | 0;
      $19_1 = HEAP32[($4_1 + 28 | 0) >> 2] | 0;
      label$264 : {
       label$265 : {
        if (!(HEAP32[($4_1 + 20 | 0) >> 2] | 0)) {
         break label$265
        }
        $6_1 = $12($19_1 | 0, $5_1 | 0, $6_1 | 0) | 0;
        break label$264;
       }
       $6_1 = $14($19_1 | 0, $5_1 | 0, $6_1 | 0) | 0;
      }
      HEAP32[($4_1 + 28 | 0) >> 2] = $6_1;
      HEAP32[($0_1 + 48 | 0) >> 2] = $6_1;
     }
     $2676 = (((HEAP32[($4_1 + 8 | 0) >> 2] | 0 | 0) != (0 | 0)) << 6 | 0) + (HEAP32[($4_1 + 64 | 0) >> 2] | 0) | 0;
     $4_1 = HEAP32[($4_1 + 4 | 0) >> 2] | 0;
     HEAP32[($0_1 + 44 | 0) >> 2] = ($2676 + ((($4_1 | 0) == (16191 | 0)) << 7 | 0) | 0) + (($4_1 | 0) == (16199 | 0) ? 256 : (($4_1 | 0) == (16194 | 0)) << 8 | 0) | 0;
     $0_1 = $22_1 ? $22_1 : -5;
     $3_1 = ($1_1 | 0) == (4 | 0) ? $0_1 : ($18_1 | 0) == ($3_1 | 0) ? (($21_1 | 0) == ($20_1 | 0) ? $0_1 : $22_1) : $22_1;
     break label$1;
    }
    HEAP32[($4_1 + 4 | 0) >> 2] = 16210;
   }
   $3_1 = -4;
  }
  global$0 = $2_1 + 16 | 0;
  return $3_1 | 0;
 }
 
 function $19($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $3_1 = 0, $4_1 = 0, $5_1 = 0, $49_1 = 0;
  label$1 : {
   label$2 : {
    $3_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
    $4_1 = HEAP32[($3_1 + 56 | 0) >> 2] | 0;
    if ($4_1) {
     break label$2
    }
    $5_1 = 1;
    $4_1 = FUNCTION_TABLE[HEAP32[($0_1 + 32 | 0) >> 2] | 0 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, 1 << (HEAP32[($3_1 + 40 | 0) >> 2] | 0) | 0, 1) | 0;
    HEAP32[($3_1 + 56 | 0) >> 2] = $4_1;
    if (!$4_1) {
     break label$1
    }
   }
   label$3 : {
    $0_1 = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
    if ($0_1) {
     break label$3
    }
    HEAP32[($3_1 + 48 | 0) >> 2] = 0;
    HEAP32[($3_1 + 52 | 0) >> 2] = 0;
    $0_1 = 1 << (HEAP32[($3_1 + 40 | 0) >> 2] | 0) | 0;
    HEAP32[($3_1 + 44 | 0) >> 2] = $0_1;
   }
   label$4 : {
    if ($0_1 >>> 0 > $2_1 >>> 0) {
     break label$4
    }
    $24($4_1 | 0, $1_1 - $0_1 | 0 | 0, $0_1 | 0) | 0;
    HEAP32[($3_1 + 52 | 0) >> 2] = 0;
    HEAP32[($3_1 + 48 | 0) >> 2] = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
    return 0 | 0;
   }
   $5_1 = HEAP32[($3_1 + 52 | 0) >> 2] | 0;
   $49_1 = $4_1 + $5_1 | 0;
   $0_1 = $0_1 - $5_1 | 0;
   $4_1 = $0_1 >>> 0 < $2_1 >>> 0 ? $0_1 : $2_1;
   $24($49_1 | 0, $1_1 - $2_1 | 0 | 0, $4_1 | 0) | 0;
   label$5 : {
    if ($0_1 >>> 0 >= $2_1 >>> 0) {
     break label$5
    }
    $2_1 = $2_1 - $4_1 | 0;
    $24(HEAP32[($3_1 + 56 | 0) >> 2] | 0 | 0, $1_1 - $2_1 | 0 | 0, $2_1 | 0) | 0;
    HEAP32[($3_1 + 52 | 0) >> 2] = $2_1;
    HEAP32[($3_1 + 48 | 0) >> 2] = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
    return 0 | 0;
   }
   $5_1 = 0;
   $2_1 = (HEAP32[($3_1 + 52 | 0) >> 2] | 0) + $4_1 | 0;
   $0_1 = HEAP32[($3_1 + 44 | 0) >> 2] | 0;
   HEAP32[($3_1 + 52 | 0) >> 2] = ($2_1 | 0) == ($0_1 | 0) ? 0 : $2_1;
   $2_1 = HEAP32[($3_1 + 48 | 0) >> 2] | 0;
   if ($2_1 >>> 0 >= $0_1 >>> 0) {
    break label$1
   }
   HEAP32[($3_1 + 48 | 0) >> 2] = $2_1 + $4_1 | 0;
  }
  return $5_1 | 0;
 }
 
 function $20($0_1) {
  $0_1 = $0_1 | 0;
  var $3_1 = 0, $1_1 = 0, $2_1 = 0;
  $1_1 = -2;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   if (!(HEAP32[($0_1 + 32 | 0) >> 2] | 0)) {
    break label$1
   }
   $2_1 = HEAP32[($0_1 + 36 | 0) >> 2] | 0;
   if (!$2_1) {
    break label$1
   }
   $3_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
   if (!$3_1) {
    break label$1
   }
   if ((HEAP32[$3_1 >> 2] | 0 | 0) != ($0_1 | 0)) {
    break label$1
   }
   if (((HEAP32[($3_1 + 4 | 0) >> 2] | 0) + -16180 | 0) >>> 0 > 31 >>> 0) {
    break label$1
   }
   label$2 : {
    $1_1 = HEAP32[($3_1 + 56 | 0) >> 2] | 0;
    if (!$1_1) {
     break label$2
    }
    FUNCTION_TABLE[$2_1 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, $1_1);
    $3_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
    $2_1 = HEAP32[($0_1 + 36 | 0) >> 2] | 0;
   }
   FUNCTION_TABLE[$2_1 | 0](HEAP32[($0_1 + 40 | 0) >> 2] | 0, $3_1);
   $1_1 = 0;
   HEAP32[($0_1 + 28 | 0) >> 2] = 0;
  }
  return $1_1 | 0;
 }
 
 function $21($0_1, $1_1, $2_1, $3_1, $4_1, $5_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  $3_1 = $3_1 | 0;
  $4_1 = $4_1 | 0;
  $5_1 = $5_1 | 0;
  var $6_1 = 0, $11_1 = 0, $16_1 = 0, $8_1 = 0, $7_1 = 0, $12_1 = 0, $13_1 = 0, $9_1 = 0, $10_1 = 0, $14_1 = 0, $18_1 = 0, $15_1 = 0, $25_1 = 0, $19_1 = 0, i64toi32_i32$1 = 0, i64toi32_i32$0 = 0, $17_1 = 0, $26_1 = 0, $23_1 = 0, $24_1 = 0, $27_1 = 0, $20_1 = 0, $21_1 = 0, $22_1 = 0, $34_1 = 0, $35_1 = 0, $403 = 0, $426 = 0, $456 = 0, $553 = 0;
  $6_1 = global$0 - 64 | 0;
  i64toi32_i32$1 = $6_1 + 48 | 0;
  i64toi32_i32$0 = 0;
  HEAP32[i64toi32_i32$1 >> 2] = 0;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $6_1 + 56 | 0;
  i64toi32_i32$0 = 0;
  HEAP32[i64toi32_i32$1 >> 2] = 0;
  HEAP32[(i64toi32_i32$1 + 4 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $6_1;
  i64toi32_i32$0 = 0;
  HEAP32[($6_1 + 32 | 0) >> 2] = 0;
  HEAP32[($6_1 + 36 | 0) >> 2] = i64toi32_i32$0;
  i64toi32_i32$1 = $6_1;
  i64toi32_i32$0 = 0;
  HEAP32[($6_1 + 40 | 0) >> 2] = 0;
  HEAP32[($6_1 + 44 | 0) >> 2] = i64toi32_i32$0;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        if (!$2_1) {
         break label$6
        }
        $7_1 = $2_1 & 3 | 0;
        $8_1 = 0;
        $9_1 = 0;
        label$7 : {
         if ($2_1 >>> 0 < 4 >>> 0) {
          break label$7
         }
         $10_1 = $2_1 & -4 | 0;
         $9_1 = 0;
         $11_1 = 0;
         label$8 : while (1) {
          $12_1 = $9_1 << 1 | 0;
          $13_1 = ($6_1 + 32 | 0) + ((HEAPU16[($1_1 + $12_1 | 0) >> 1] | 0) << 1 | 0) | 0;
          HEAP16[$13_1 >> 1] = (HEAPU16[$13_1 >> 1] | 0) + 1 | 0;
          $13_1 = ($6_1 + 32 | 0) + ((HEAPU16[($1_1 + ($12_1 | 2 | 0) | 0) >> 1] | 0) << 1 | 0) | 0;
          HEAP16[$13_1 >> 1] = (HEAPU16[$13_1 >> 1] | 0) + 1 | 0;
          $13_1 = ($6_1 + 32 | 0) + ((HEAPU16[($1_1 + ($12_1 | 4 | 0) | 0) >> 1] | 0) << 1 | 0) | 0;
          HEAP16[$13_1 >> 1] = (HEAPU16[$13_1 >> 1] | 0) + 1 | 0;
          $12_1 = ($6_1 + 32 | 0) + ((HEAPU16[($1_1 + ($12_1 | 6 | 0) | 0) >> 1] | 0) << 1 | 0) | 0;
          HEAP16[$12_1 >> 1] = (HEAPU16[$12_1 >> 1] | 0) + 1 | 0;
          $9_1 = $9_1 + 4 | 0;
          $11_1 = $11_1 + 4 | 0;
          if (($11_1 | 0) != ($10_1 | 0)) {
           continue label$8
          }
          break label$8;
         };
        }
        label$9 : {
         if (!$7_1) {
          break label$9
         }
         label$10 : while (1) {
          $12_1 = ($6_1 + 32 | 0) + ((HEAPU16[($1_1 + ($9_1 << 1 | 0) | 0) >> 1] | 0) << 1 | 0) | 0;
          HEAP16[$12_1 >> 1] = (HEAPU16[$12_1 >> 1] | 0) + 1 | 0;
          $9_1 = $9_1 + 1 | 0;
          $8_1 = $8_1 + 1 | 0;
          if (($8_1 | 0) != ($7_1 | 0)) {
           continue label$10
          }
          break label$10;
         };
        }
        $9_1 = HEAP32[$4_1 >> 2] | 0;
        $12_1 = 15;
        $7_1 = HEAPU16[($6_1 + 62 | 0) >> 1] | 0;
        if ($7_1) {
         break label$4
        }
        break label$5;
       }
       $9_1 = HEAP32[$4_1 >> 2] | 0;
      }
      $12_1 = 14;
      $7_1 = 0;
      if (HEAPU16[($6_1 + 60 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 13;
      if (HEAPU16[($6_1 + 58 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 12;
      if (HEAPU16[($6_1 + 56 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 11;
      if (HEAPU16[($6_1 + 54 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 10;
      if (HEAPU16[($6_1 + 52 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 9;
      if (HEAPU16[($6_1 + 50 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 8;
      if (HEAPU16[($6_1 + 48 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 7;
      if (HEAPU16[($6_1 + 46 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 6;
      if (HEAPU16[($6_1 + 44 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 5;
      if (HEAPU16[($6_1 + 42 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 4;
      if (HEAPU16[($6_1 + 40 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 3;
      if (HEAPU16[($6_1 + 38 | 0) >> 1] | 0) {
       break label$4
      }
      $12_1 = 2;
      if (HEAPU16[($6_1 + 36 | 0) >> 1] | 0) {
       break label$4
      }
      label$11 : {
       if (HEAPU16[($6_1 + 34 | 0) >> 1] | 0) {
        break label$11
       }
       $6_1 = HEAP32[$3_1 >> 2] | 0;
       HEAP32[$3_1 >> 2] = $6_1 + 4 | 0;
       $34_1 = 320;
       HEAP16[$6_1 >> 1] = $34_1;
       HEAP16[($6_1 + 2 | 0) >> 1] = $34_1 >>> 16 | 0;
       $6_1 = HEAP32[$3_1 >> 2] | 0;
       HEAP32[$3_1 >> 2] = $6_1 + 4 | 0;
       $35_1 = 320;
       HEAP16[$6_1 >> 1] = $35_1;
       HEAP16[($6_1 + 2 | 0) >> 1] = $35_1 >>> 16 | 0;
       $14_1 = 1;
       break label$2;
      }
      $13_1 = 0;
      $10_1 = ($9_1 | 0) != (0 | 0);
      $12_1 = 1;
      $7_1 = 0;
      $9_1 = 1;
      break label$3;
     }
     $10_1 = $9_1 >>> 0 < $12_1 >>> 0 ? $9_1 : $12_1;
     $13_1 = 1;
     $9_1 = 1;
     label$12 : while (1) {
      if (HEAPU16[(($6_1 + 32 | 0) + ($9_1 << 1 | 0) | 0) >> 1] | 0) {
       break label$3
      }
      $9_1 = $9_1 + 1 | 0;
      if (($9_1 | 0) != ($12_1 | 0)) {
       continue label$12
      }
      break label$12;
     };
     $13_1 = 1;
     $9_1 = $12_1;
    }
    $8_1 = -1;
    $11_1 = HEAPU16[($6_1 + 34 | 0) >> 1] | 0;
    if ($11_1 >>> 0 > 2 >>> 0) {
     break label$1
    }
    $15_1 = HEAPU16[($6_1 + 36 | 0) >> 1] | 0;
    $16_1 = ($11_1 << 1 | 0) + $15_1 | 0;
    if ($16_1 >>> 0 > 4 >>> 0) {
     break label$1
    }
    $17_1 = HEAPU16[($6_1 + 38 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) + $17_1 | 0;
    if ($16_1 >>> 0 > 8 >>> 0) {
     break label$1
    }
    $18_1 = HEAPU16[($6_1 + 40 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) + $18_1 | 0;
    if (($16_1 | 0) > (16 | 0)) {
     break label$1
    }
    $19_1 = HEAPU16[($6_1 + 42 | 0) >> 1] | 0;
    $16_1 = 32 - (($16_1 << 1 | 0) + $19_1 | 0) | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $14_1 = HEAPU16[($6_1 + 44 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $14_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $20_1 = HEAPU16[($6_1 + 46 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $20_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $21_1 = HEAPU16[($6_1 + 48 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $21_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $22_1 = HEAPU16[($6_1 + 50 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $22_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $23_1 = HEAPU16[($6_1 + 52 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $23_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $24_1 = HEAPU16[($6_1 + 54 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $24_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $25_1 = HEAPU16[($6_1 + 56 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $25_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $26_1 = HEAPU16[($6_1 + 58 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $26_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $27_1 = HEAPU16[($6_1 + 60 | 0) >> 1] | 0;
    $16_1 = ($16_1 << 1 | 0) - $27_1 | 0;
    if (($16_1 | 0) < (0 | 0)) {
     break label$1
    }
    $16_1 = $16_1 << 1 | 0;
    if ($16_1 >>> 0 < $7_1 >>> 0) {
     break label$1
    }
    label$13 : {
     if (($16_1 | 0) == ($7_1 | 0)) {
      break label$13
     }
     if (!$0_1 | $13_1 | 0) {
      break label$1
     }
    }
    $16_1 = $10_1 >>> 0 > $9_1 >>> 0;
    $8_1 = 0;
    HEAP16[($6_1 + 2 | 0) >> 1] = 0;
    HEAP16[($6_1 + 4 | 0) >> 1] = $11_1;
    $11_1 = $15_1 + $11_1 | 0;
    HEAP16[($6_1 + 6 | 0) >> 1] = $11_1;
    $11_1 = $17_1 + $11_1 | 0;
    HEAP16[($6_1 + 8 | 0) >> 1] = $11_1;
    $11_1 = $18_1 + $11_1 | 0;
    HEAP16[($6_1 + 10 | 0) >> 1] = $11_1;
    $11_1 = $19_1 + $11_1 | 0;
    HEAP16[($6_1 + 12 | 0) >> 1] = $11_1;
    $11_1 = $14_1 + $11_1 | 0;
    HEAP16[($6_1 + 14 | 0) >> 1] = $11_1;
    $11_1 = $20_1 + $11_1 | 0;
    HEAP16[($6_1 + 16 | 0) >> 1] = $11_1;
    $11_1 = $21_1 + $11_1 | 0;
    HEAP16[($6_1 + 18 | 0) >> 1] = $11_1;
    $11_1 = $22_1 + $11_1 | 0;
    HEAP16[($6_1 + 20 | 0) >> 1] = $11_1;
    $11_1 = $23_1 + $11_1 | 0;
    HEAP16[($6_1 + 22 | 0) >> 1] = $11_1;
    $11_1 = $24_1 + $11_1 | 0;
    HEAP16[($6_1 + 24 | 0) >> 1] = $11_1;
    $11_1 = $25_1 + $11_1 | 0;
    HEAP16[($6_1 + 26 | 0) >> 1] = $11_1;
    $11_1 = $26_1 + $11_1 | 0;
    HEAP16[($6_1 + 28 | 0) >> 1] = $11_1;
    HEAP16[($6_1 + 30 | 0) >> 1] = $27_1 + $11_1 | 0;
    label$14 : {
     if (!$2_1) {
      break label$14
     }
     $15_1 = $2_1 & 1 | 0;
     label$15 : {
      if (($2_1 | 0) == (1 | 0)) {
       break label$15
      }
      $2_1 = $2_1 & -2 | 0;
      $8_1 = 0;
      $11_1 = 0;
      label$16 : while (1) {
       label$17 : {
        $13_1 = HEAPU16[($1_1 + ($8_1 << 1 | 0) | 0) >> 1] | 0;
        if (!$13_1) {
         break label$17
        }
        $13_1 = $6_1 + ($13_1 << 1 | 0) | 0;
        $403 = $13_1;
        $13_1 = HEAPU16[$13_1 >> 1] | 0;
        HEAP16[$403 >> 1] = $13_1 + 1 | 0;
        HEAP16[($5_1 + ($13_1 << 1 | 0) | 0) >> 1] = $8_1;
       }
       label$18 : {
        $13_1 = $8_1 | 1 | 0;
        $7_1 = HEAPU16[($1_1 + ($13_1 << 1 | 0) | 0) >> 1] | 0;
        if (!$7_1) {
         break label$18
        }
        $7_1 = $6_1 + ($7_1 << 1 | 0) | 0;
        $426 = $7_1;
        $7_1 = HEAPU16[$7_1 >> 1] | 0;
        HEAP16[$426 >> 1] = $7_1 + 1 | 0;
        HEAP16[($5_1 + ($7_1 << 1 | 0) | 0) >> 1] = $13_1;
       }
       $8_1 = $8_1 + 2 | 0;
       $11_1 = $11_1 + 2 | 0;
       if (($11_1 | 0) != ($2_1 | 0)) {
        continue label$16
       }
       break label$16;
      };
     }
     if (!$15_1) {
      break label$14
     }
     $11_1 = HEAPU16[($1_1 + ($8_1 << 1 | 0) | 0) >> 1] | 0;
     if (!$11_1) {
      break label$14
     }
     $11_1 = $6_1 + ($11_1 << 1 | 0) | 0;
     $456 = $11_1;
     $11_1 = HEAPU16[$11_1 >> 1] | 0;
     HEAP16[$456 >> 1] = $11_1 + 1 | 0;
     HEAP16[($5_1 + ($11_1 << 1 | 0) | 0) >> 1] = $8_1;
    }
    $14_1 = $16_1 ? $10_1 : $9_1;
    $19_1 = 20;
    $27_1 = 0;
    $23_1 = $5_1;
    $24_1 = $5_1;
    $26_1 = 0;
    label$19 : {
     label$20 : {
      switch ($0_1 | 0) {
      case 1:
       $8_1 = 1;
       if ($14_1 >>> 0 > 9 >>> 0) {
        break label$1
       }
       $19_1 = 257;
       $24_1 = 74432;
       $23_1 = 74368;
       $27_1 = 0;
       $26_1 = 1;
       break label$19;
      case 0:
       break label$19;
      default:
       break label$20;
      };
     }
     $27_1 = ($0_1 | 0) == (2 | 0);
     $19_1 = 0;
     $24_1 = 74560;
     $23_1 = 74496;
     label$22 : {
      if (($0_1 | 0) == (2 | 0)) {
       break label$22
      }
      $26_1 = 0;
      break label$19;
     }
     $8_1 = 1;
     $26_1 = 0;
     if ($14_1 >>> 0 > 9 >>> 0) {
      break label$1
     }
    }
    $25_1 = 1 << $14_1 | 0;
    $22_1 = $25_1 + -1 | 0;
    $15_1 = HEAP32[$3_1 >> 2] | 0;
    $17_1 = 0;
    $7_1 = $14_1;
    $18_1 = 0;
    $13_1 = 0;
    $21_1 = -1;
    label$23 : while (1) {
     $20_1 = 1 << $7_1 | 0;
     label$24 : {
      label$25 : while (1) {
       $10_1 = $9_1 - $18_1 | 0;
       $2_1 = 0;
       label$26 : {
        $7_1 = HEAPU16[($5_1 + ($17_1 << 1 | 0) | 0) >> 1] | 0;
        if (($7_1 + 1 | 0) >>> 0 < $19_1 >>> 0) {
         break label$26
        }
        label$27 : {
         if ($19_1 >>> 0 <= $7_1 >>> 0) {
          break label$27
         }
         $2_1 = 96;
         $7_1 = 0;
         break label$26;
        }
        $8_1 = ($7_1 - $19_1 | 0) << 1 | 0;
        $7_1 = HEAPU16[($23_1 + $8_1 | 0) >> 1] | 0;
        $2_1 = HEAPU8[($24_1 + $8_1 | 0) >> 0] | 0;
       }
       $0_1 = $13_1 >>> $18_1 | 0;
       $16_1 = -1 << $10_1 | 0;
       $8_1 = $20_1;
       label$28 : while (1) {
        $8_1 = $8_1 + $16_1 | 0;
        $11_1 = $15_1 + (($8_1 + $0_1 | 0) << 2 | 0) | 0;
        HEAP16[($11_1 + 2 | 0) >> 1] = $7_1;
        HEAP8[($11_1 + 1 | 0) >> 0] = $10_1;
        HEAP8[$11_1 >> 0] = $2_1;
        if ($8_1) {
         continue label$28
        }
        break label$28;
       };
       $11_1 = 1 << ($9_1 + -1 | 0) | 0;
       label$29 : while (1) {
        $8_1 = $11_1;
        $11_1 = $11_1 >>> 1 | 0;
        if ($8_1 & $13_1 | 0) {
         continue label$29
        }
        break label$29;
       };
       $11_1 = ($6_1 + 32 | 0) + ($9_1 << 1 | 0) | 0;
       $553 = $11_1;
       $11_1 = (HEAPU16[$11_1 >> 1] | 0) + -1 | 0;
       HEAP16[$553 >> 1] = $11_1;
       $13_1 = $8_1 ? (($8_1 + -1 | 0) & $13_1 | 0) + $8_1 | 0 : 0;
       $17_1 = $17_1 + 1 | 0;
       label$30 : {
        if ($11_1 & 65535 | 0) {
         break label$30
        }
        if (($9_1 | 0) == ($12_1 | 0)) {
         break label$24
        }
        $9_1 = HEAPU16[($1_1 + ((HEAPU16[($5_1 + ($17_1 << 1 | 0) | 0) >> 1] | 0) << 1 | 0) | 0) >> 1] | 0;
       }
       if ($9_1 >>> 0 <= $14_1 >>> 0) {
        continue label$25
       }
       $11_1 = $13_1 & $22_1 | 0;
       if (($11_1 | 0) == ($21_1 | 0)) {
        continue label$25
       }
       break label$25;
      };
      $18_1 = $18_1 ? $18_1 : $14_1;
      $7_1 = $9_1 - $18_1 | 0;
      $10_1 = 1 << $7_1 | 0;
      label$31 : {
       if ($9_1 >>> 0 >= $12_1 >>> 0) {
        break label$31
       }
       $2_1 = $12_1 - $18_1 | 0;
       $8_1 = $9_1;
       label$32 : {
        label$33 : while (1) {
         $8_1 = $10_1 - (HEAPU16[(($6_1 + 32 | 0) + ($8_1 << 1 | 0) | 0) >> 1] | 0) | 0;
         if (($8_1 | 0) < (1 | 0)) {
          break label$32
         }
         $10_1 = $8_1 << 1 | 0;
         $7_1 = $7_1 + 1 | 0;
         $8_1 = $7_1 + $18_1 | 0;
         if ($8_1 >>> 0 < $12_1 >>> 0) {
          continue label$33
         }
         break label$33;
        };
        $7_1 = $2_1;
       }
       $10_1 = 1 << $7_1 | 0;
      }
      $8_1 = 1;
      $25_1 = $10_1 + $25_1 | 0;
      if ($26_1 & $25_1 >>> 0 > 852 >>> 0 | 0) {
       break label$1
      }
      if ($27_1 & $25_1 >>> 0 > 592 >>> 0 | 0) {
       break label$1
      }
      $10_1 = HEAP32[$3_1 >> 2] | 0;
      $8_1 = $10_1 + ($11_1 << 2 | 0) | 0;
      HEAP8[($8_1 + 1 | 0) >> 0] = $14_1;
      HEAP8[$8_1 >> 0] = $7_1;
      $15_1 = $15_1 + ($20_1 << 2 | 0) | 0;
      HEAP16[($8_1 + 2 | 0) >> 1] = ($15_1 - $10_1 | 0) >>> 2 | 0;
      $21_1 = $11_1;
      continue label$23;
     }
     break label$23;
    };
    label$34 : {
     if (!$13_1) {
      break label$34
     }
     $6_1 = $15_1 + ($13_1 << 2 | 0) | 0;
     HEAP16[($6_1 + 2 | 0) >> 1] = 0;
     HEAP8[($6_1 + 1 | 0) >> 0] = $10_1;
     HEAP8[$6_1 >> 0] = 64;
    }
    HEAP32[$3_1 >> 2] = (HEAP32[$3_1 >> 2] | 0) + ($25_1 << 2 | 0) | 0;
   }
   HEAP32[$4_1 >> 2] = $14_1;
   $8_1 = 0;
  }
  return $8_1 | 0;
 }
 
 function $22($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  return $28(Math_imul($2_1, $1_1) | 0) | 0 | 0;
 }
 
 function $23($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $29($1_1 | 0);
 }
 
 function $24($0_1, $1_1, $2_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  $2_1 = $2_1 | 0;
  var $4_1 = 0, $3_1 = 0, $5_1 = 0;
  label$1 : {
   if ($2_1 >>> 0 < 512 >>> 0) {
    break label$1
   }
   fimport$0($0_1 | 0, $1_1 | 0, $2_1 | 0);
   return $0_1 | 0;
  }
  $3_1 = $0_1 + $2_1 | 0;
  label$2 : {
   label$3 : {
    if (($1_1 ^ $0_1 | 0) & 3 | 0) {
     break label$3
    }
    label$4 : {
     label$5 : {
      if ($0_1 & 3 | 0) {
       break label$5
      }
      $2_1 = $0_1;
      break label$4;
     }
     label$6 : {
      if ($2_1) {
       break label$6
      }
      $2_1 = $0_1;
      break label$4;
     }
     $2_1 = $0_1;
     label$7 : while (1) {
      HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
      $1_1 = $1_1 + 1 | 0;
      $2_1 = $2_1 + 1 | 0;
      if (!($2_1 & 3 | 0)) {
       break label$4
      }
      if ($2_1 >>> 0 < $3_1 >>> 0) {
       continue label$7
      }
      break label$7;
     };
    }
    label$8 : {
     $4_1 = $3_1 & -4 | 0;
     if ($4_1 >>> 0 < 64 >>> 0) {
      break label$8
     }
     $5_1 = $4_1 + -64 | 0;
     if ($2_1 >>> 0 > $5_1 >>> 0) {
      break label$8
     }
     label$9 : while (1) {
      HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
      HEAP32[($2_1 + 4 | 0) >> 2] = HEAP32[($1_1 + 4 | 0) >> 2] | 0;
      HEAP32[($2_1 + 8 | 0) >> 2] = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
      HEAP32[($2_1 + 12 | 0) >> 2] = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
      HEAP32[($2_1 + 16 | 0) >> 2] = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
      HEAP32[($2_1 + 20 | 0) >> 2] = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
      HEAP32[($2_1 + 24 | 0) >> 2] = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
      HEAP32[($2_1 + 28 | 0) >> 2] = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
      HEAP32[($2_1 + 32 | 0) >> 2] = HEAP32[($1_1 + 32 | 0) >> 2] | 0;
      HEAP32[($2_1 + 36 | 0) >> 2] = HEAP32[($1_1 + 36 | 0) >> 2] | 0;
      HEAP32[($2_1 + 40 | 0) >> 2] = HEAP32[($1_1 + 40 | 0) >> 2] | 0;
      HEAP32[($2_1 + 44 | 0) >> 2] = HEAP32[($1_1 + 44 | 0) >> 2] | 0;
      HEAP32[($2_1 + 48 | 0) >> 2] = HEAP32[($1_1 + 48 | 0) >> 2] | 0;
      HEAP32[($2_1 + 52 | 0) >> 2] = HEAP32[($1_1 + 52 | 0) >> 2] | 0;
      HEAP32[($2_1 + 56 | 0) >> 2] = HEAP32[($1_1 + 56 | 0) >> 2] | 0;
      HEAP32[($2_1 + 60 | 0) >> 2] = HEAP32[($1_1 + 60 | 0) >> 2] | 0;
      $1_1 = $1_1 + 64 | 0;
      $2_1 = $2_1 + 64 | 0;
      if ($2_1 >>> 0 <= $5_1 >>> 0) {
       continue label$9
      }
      break label$9;
     };
    }
    if ($2_1 >>> 0 >= $4_1 >>> 0) {
     break label$2
    }
    label$10 : while (1) {
     HEAP32[$2_1 >> 2] = HEAP32[$1_1 >> 2] | 0;
     $1_1 = $1_1 + 4 | 0;
     $2_1 = $2_1 + 4 | 0;
     if ($2_1 >>> 0 < $4_1 >>> 0) {
      continue label$10
     }
     break label$2;
    };
   }
   label$11 : {
    if ($3_1 >>> 0 >= 4 >>> 0) {
     break label$11
    }
    $2_1 = $0_1;
    break label$2;
   }
   label$12 : {
    $4_1 = $3_1 + -4 | 0;
    if ($4_1 >>> 0 >= $0_1 >>> 0) {
     break label$12
    }
    $2_1 = $0_1;
    break label$2;
   }
   $2_1 = $0_1;
   label$13 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    HEAP8[($2_1 + 1 | 0) >> 0] = HEAPU8[($1_1 + 1 | 0) >> 0] | 0;
    HEAP8[($2_1 + 2 | 0) >> 0] = HEAPU8[($1_1 + 2 | 0) >> 0] | 0;
    HEAP8[($2_1 + 3 | 0) >> 0] = HEAPU8[($1_1 + 3 | 0) >> 0] | 0;
    $1_1 = $1_1 + 4 | 0;
    $2_1 = $2_1 + 4 | 0;
    if ($2_1 >>> 0 <= $4_1 >>> 0) {
     continue label$13
    }
    break label$13;
   };
  }
  label$14 : {
   if ($2_1 >>> 0 >= $3_1 >>> 0) {
    break label$14
   }
   label$15 : while (1) {
    HEAP8[$2_1 >> 0] = HEAPU8[$1_1 >> 0] | 0;
    $1_1 = $1_1 + 1 | 0;
    $2_1 = $2_1 + 1 | 0;
    if (($2_1 | 0) != ($3_1 | 0)) {
     continue label$15
    }
    break label$15;
   };
  }
  return $0_1 | 0;
 }
 
 function $25() {
  return __wasm_memory_size() << 16 | 0 | 0;
 }
 
 function $26() {
  return 74628 | 0;
 }
 
 function $27($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, $2_1 = 0;
  $1_1 = HEAP32[(0 + 74624 | 0) >> 2] | 0;
  $2_1 = ($0_1 + 7 | 0) & -8 | 0;
  $0_1 = $1_1 + $2_1 | 0;
  label$1 : {
   label$2 : {
    if (!$2_1) {
     break label$2
    }
    if ($0_1 >>> 0 <= $1_1 >>> 0) {
     break label$1
    }
   }
   label$3 : {
    if ($0_1 >>> 0 <= ($25() | 0) >>> 0) {
     break label$3
    }
    if (!(fimport$1($0_1 | 0) | 0)) {
     break label$1
    }
   }
   HEAP32[(0 + 74624 | 0) >> 2] = $0_1;
   return $1_1 | 0;
  }
  HEAP32[($26() | 0) >> 2] = 48;
  return -1 | 0;
 }
 
 function $28($0_1) {
  $0_1 = $0_1 | 0;
  var $4_1 = 0, $7_1 = 0, $5_1 = 0, $8_1 = 0, $3_1 = 0, $2_1 = 0, $11_1 = 0, $6_1 = 0, i64toi32_i32$0 = 0, i64toi32_i32$1 = 0, $9_1 = 0, i64toi32_i32$2 = 0, $10_1 = 0, $1_1 = 0, $79 = 0, $191 = 0, $945 = 0, $947 = 0;
  $1_1 = global$0 - 16 | 0;
  global$0 = $1_1;
  label$1 : {
   label$2 : {
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        label$7 : {
         label$8 : {
          label$9 : {
           label$10 : {
            label$11 : {
             label$12 : {
              label$13 : {
               label$14 : {
                label$15 : {
                 if ($0_1 >>> 0 > 244 >>> 0) {
                  break label$15
                 }
                 label$16 : {
                  $2_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
                  $3_1 = $0_1 >>> 0 < 11 >>> 0 ? 16 : ($0_1 + 11 | 0) & -8 | 0;
                  $4_1 = $3_1 >>> 3 | 0;
                  $0_1 = $2_1 >>> $4_1 | 0;
                  if (!($0_1 & 3 | 0)) {
                   break label$16
                  }
                  label$17 : {
                   label$18 : {
                    $5_1 = (($0_1 ^ -1 | 0) & 1 | 0) + $4_1 | 0;
                    $4_1 = $5_1 << 3 | 0;
                    $0_1 = $4_1 + 74672 | 0;
                    $4_1 = HEAP32[($4_1 + 74680 | 0) >> 2] | 0;
                    $3_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
                    if (($0_1 | 0) != ($3_1 | 0)) {
                     break label$18
                    }
                    HEAP32[(0 + 74632 | 0) >> 2] = $2_1 & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
                    break label$17;
                   }
                   HEAP32[($3_1 + 12 | 0) >> 2] = $0_1;
                   HEAP32[($0_1 + 8 | 0) >> 2] = $3_1;
                  }
                  $0_1 = $4_1 + 8 | 0;
                  $5_1 = $5_1 << 3 | 0;
                  HEAP32[($4_1 + 4 | 0) >> 2] = $5_1 | 3 | 0;
                  $4_1 = $4_1 + $5_1 | 0;
                  HEAP32[($4_1 + 4 | 0) >> 2] = HEAP32[($4_1 + 4 | 0) >> 2] | 0 | 1 | 0;
                  break label$1;
                 }
                 $6_1 = HEAP32[(0 + 74640 | 0) >> 2] | 0;
                 if ($3_1 >>> 0 <= $6_1 >>> 0) {
                  break label$14
                 }
                 label$19 : {
                  if (!$0_1) {
                   break label$19
                  }
                  label$20 : {
                   label$21 : {
                    $79 = $0_1 << $4_1 | 0;
                    $0_1 = 2 << $4_1 | 0;
                    $0_1 = $79 & ($0_1 | (0 - $0_1 | 0) | 0) | 0;
                    $4_1 = __wasm_ctz_i32($0_1 & (0 - $0_1 | 0) | 0 | 0) | 0;
                    $0_1 = $4_1 << 3 | 0;
                    $5_1 = $0_1 + 74672 | 0;
                    $0_1 = HEAP32[($0_1 + 74680 | 0) >> 2] | 0;
                    $7_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                    if (($5_1 | 0) != ($7_1 | 0)) {
                     break label$21
                    }
                    $2_1 = $2_1 & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
                    HEAP32[(0 + 74632 | 0) >> 2] = $2_1;
                    break label$20;
                   }
                   HEAP32[($7_1 + 12 | 0) >> 2] = $5_1;
                   HEAP32[($5_1 + 8 | 0) >> 2] = $7_1;
                  }
                  HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
                  $7_1 = $0_1 + $3_1 | 0;
                  $4_1 = $4_1 << 3 | 0;
                  $5_1 = $4_1 - $3_1 | 0;
                  HEAP32[($7_1 + 4 | 0) >> 2] = $5_1 | 1 | 0;
                  HEAP32[($0_1 + $4_1 | 0) >> 2] = $5_1;
                  label$22 : {
                   if (!$6_1) {
                    break label$22
                   }
                   $3_1 = ($6_1 & -8 | 0) + 74672 | 0;
                   $4_1 = HEAP32[(0 + 74652 | 0) >> 2] | 0;
                   label$23 : {
                    label$24 : {
                     $8_1 = 1 << ($6_1 >>> 3 | 0) | 0;
                     if ($2_1 & $8_1 | 0) {
                      break label$24
                     }
                     HEAP32[(0 + 74632 | 0) >> 2] = $2_1 | $8_1 | 0;
                     $8_1 = $3_1;
                     break label$23;
                    }
                    $8_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
                   }
                   HEAP32[($3_1 + 8 | 0) >> 2] = $4_1;
                   HEAP32[($8_1 + 12 | 0) >> 2] = $4_1;
                   HEAP32[($4_1 + 12 | 0) >> 2] = $3_1;
                   HEAP32[($4_1 + 8 | 0) >> 2] = $8_1;
                  }
                  $0_1 = $0_1 + 8 | 0;
                  HEAP32[(0 + 74652 | 0) >> 2] = $7_1;
                  HEAP32[(0 + 74640 | 0) >> 2] = $5_1;
                  break label$1;
                 }
                 $9_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
                 if (!$9_1) {
                  break label$14
                 }
                 $7_1 = HEAP32[(((__wasm_ctz_i32($9_1 & (0 - $9_1 | 0) | 0 | 0) | 0) << 2 | 0) + 74936 | 0) >> 2] | 0;
                 $4_1 = ((HEAP32[($7_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                 $5_1 = $7_1;
                 label$25 : {
                  label$26 : while (1) {
                   label$27 : {
                    $0_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
                    if ($0_1) {
                     break label$27
                    }
                    $0_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
                    if (!$0_1) {
                     break label$25
                    }
                   }
                   $5_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                   $191 = $5_1;
                   $5_1 = $5_1 >>> 0 < $4_1 >>> 0;
                   $4_1 = $5_1 ? $191 : $4_1;
                   $7_1 = $5_1 ? $0_1 : $7_1;
                   $5_1 = $0_1;
                   continue label$26;
                  };
                 }
                 $10_1 = HEAP32[($7_1 + 24 | 0) >> 2] | 0;
                 label$28 : {
                  $8_1 = HEAP32[($7_1 + 12 | 0) >> 2] | 0;
                  if (($8_1 | 0) == ($7_1 | 0)) {
                   break label$28
                  }
                  $0_1 = HEAP32[($7_1 + 8 | 0) >> 2] | 0;
                  HEAP32[(0 + 74648 | 0) >> 2] | 0;
                  HEAP32[($0_1 + 12 | 0) >> 2] = $8_1;
                  HEAP32[($8_1 + 8 | 0) >> 2] = $0_1;
                  break label$2;
                 }
                 label$29 : {
                  $5_1 = $7_1 + 20 | 0;
                  $0_1 = HEAP32[$5_1 >> 2] | 0;
                  if ($0_1) {
                   break label$29
                  }
                  $0_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
                  if (!$0_1) {
                   break label$13
                  }
                  $5_1 = $7_1 + 16 | 0;
                 }
                 label$30 : while (1) {
                  $11_1 = $5_1;
                  $8_1 = $0_1;
                  $5_1 = $0_1 + 20 | 0;
                  $0_1 = HEAP32[$5_1 >> 2] | 0;
                  if ($0_1) {
                   continue label$30
                  }
                  $5_1 = $8_1 + 16 | 0;
                  $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
                  if ($0_1) {
                   continue label$30
                  }
                  break label$30;
                 };
                 HEAP32[$11_1 >> 2] = 0;
                 break label$2;
                }
                $3_1 = -1;
                if ($0_1 >>> 0 > -65 >>> 0) {
                 break label$14
                }
                $0_1 = $0_1 + 11 | 0;
                $3_1 = $0_1 & -8 | 0;
                $6_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
                if (!$6_1) {
                 break label$14
                }
                $11_1 = 0;
                label$31 : {
                 if ($3_1 >>> 0 < 256 >>> 0) {
                  break label$31
                 }
                 $11_1 = 31;
                 if ($3_1 >>> 0 > 16777215 >>> 0) {
                  break label$31
                 }
                 $0_1 = Math_clz32($0_1 >>> 8 | 0);
                 $11_1 = ((($3_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
                }
                $4_1 = 0 - $3_1 | 0;
                label$32 : {
                 label$33 : {
                  label$34 : {
                   label$35 : {
                    $5_1 = HEAP32[(($11_1 << 2 | 0) + 74936 | 0) >> 2] | 0;
                    if ($5_1) {
                     break label$35
                    }
                    $0_1 = 0;
                    $8_1 = 0;
                    break label$34;
                   }
                   $0_1 = 0;
                   $7_1 = $3_1 << (($11_1 | 0) == (31 | 0) ? 0 : 25 - ($11_1 >>> 1 | 0) | 0) | 0;
                   $8_1 = 0;
                   label$36 : while (1) {
                    label$37 : {
                     $2_1 = ((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                     if ($2_1 >>> 0 >= $4_1 >>> 0) {
                      break label$37
                     }
                     $4_1 = $2_1;
                     $8_1 = $5_1;
                     if ($4_1) {
                      break label$37
                     }
                     $4_1 = 0;
                     $8_1 = $5_1;
                     $0_1 = $5_1;
                     break label$33;
                    }
                    $2_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
                    $5_1 = HEAP32[(($5_1 + (($7_1 >>> 29 | 0) & 4 | 0) | 0) + 16 | 0) >> 2] | 0;
                    $0_1 = $2_1 ? (($2_1 | 0) == ($5_1 | 0) ? $0_1 : $2_1) : $0_1;
                    $7_1 = $7_1 << 1 | 0;
                    if ($5_1) {
                     continue label$36
                    }
                    break label$36;
                   };
                  }
                  label$38 : {
                   if ($0_1 | $8_1 | 0) {
                    break label$38
                   }
                   $8_1 = 0;
                   $0_1 = 2 << $11_1 | 0;
                   $0_1 = ($0_1 | (0 - $0_1 | 0) | 0) & $6_1 | 0;
                   if (!$0_1) {
                    break label$14
                   }
                   $0_1 = HEAP32[(((__wasm_ctz_i32($0_1 & (0 - $0_1 | 0) | 0 | 0) | 0) << 2 | 0) + 74936 | 0) >> 2] | 0;
                  }
                  if (!$0_1) {
                   break label$32
                  }
                 }
                 label$39 : while (1) {
                  $2_1 = ((HEAP32[($0_1 + 4 | 0) >> 2] | 0) & -8 | 0) - $3_1 | 0;
                  $7_1 = $2_1 >>> 0 < $4_1 >>> 0;
                  label$40 : {
                   $5_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
                   if ($5_1) {
                    break label$40
                   }
                   $5_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
                  }
                  $4_1 = $7_1 ? $2_1 : $4_1;
                  $8_1 = $7_1 ? $0_1 : $8_1;
                  $0_1 = $5_1;
                  if ($0_1) {
                   continue label$39
                  }
                  break label$39;
                 };
                }
                if (!$8_1) {
                 break label$14
                }
                if ($4_1 >>> 0 >= ((HEAP32[(0 + 74640 | 0) >> 2] | 0) - $3_1 | 0) >>> 0) {
                 break label$14
                }
                $11_1 = HEAP32[($8_1 + 24 | 0) >> 2] | 0;
                label$41 : {
                 $7_1 = HEAP32[($8_1 + 12 | 0) >> 2] | 0;
                 if (($7_1 | 0) == ($8_1 | 0)) {
                  break label$41
                 }
                 $0_1 = HEAP32[($8_1 + 8 | 0) >> 2] | 0;
                 HEAP32[(0 + 74648 | 0) >> 2] | 0;
                 HEAP32[($0_1 + 12 | 0) >> 2] = $7_1;
                 HEAP32[($7_1 + 8 | 0) >> 2] = $0_1;
                 break label$3;
                }
                label$42 : {
                 $5_1 = $8_1 + 20 | 0;
                 $0_1 = HEAP32[$5_1 >> 2] | 0;
                 if ($0_1) {
                  break label$42
                 }
                 $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
                 if (!$0_1) {
                  break label$12
                 }
                 $5_1 = $8_1 + 16 | 0;
                }
                label$43 : while (1) {
                 $2_1 = $5_1;
                 $7_1 = $0_1;
                 $5_1 = $0_1 + 20 | 0;
                 $0_1 = HEAP32[$5_1 >> 2] | 0;
                 if ($0_1) {
                  continue label$43
                 }
                 $5_1 = $7_1 + 16 | 0;
                 $0_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
                 if ($0_1) {
                  continue label$43
                 }
                 break label$43;
                };
                HEAP32[$2_1 >> 2] = 0;
                break label$3;
               }
               label$44 : {
                $0_1 = HEAP32[(0 + 74640 | 0) >> 2] | 0;
                if ($0_1 >>> 0 < $3_1 >>> 0) {
                 break label$44
                }
                $4_1 = HEAP32[(0 + 74652 | 0) >> 2] | 0;
                label$45 : {
                 label$46 : {
                  $5_1 = $0_1 - $3_1 | 0;
                  if ($5_1 >>> 0 < 16 >>> 0) {
                   break label$46
                  }
                  $7_1 = $4_1 + $3_1 | 0;
                  HEAP32[($7_1 + 4 | 0) >> 2] = $5_1 | 1 | 0;
                  HEAP32[($4_1 + $0_1 | 0) >> 2] = $5_1;
                  HEAP32[($4_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
                  break label$45;
                 }
                 HEAP32[($4_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
                 $0_1 = $4_1 + $0_1 | 0;
                 HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
                 $7_1 = 0;
                 $5_1 = 0;
                }
                HEAP32[(0 + 74640 | 0) >> 2] = $5_1;
                HEAP32[(0 + 74652 | 0) >> 2] = $7_1;
                $0_1 = $4_1 + 8 | 0;
                break label$1;
               }
               label$47 : {
                $7_1 = HEAP32[(0 + 74644 | 0) >> 2] | 0;
                if ($7_1 >>> 0 <= $3_1 >>> 0) {
                 break label$47
                }
                $4_1 = $7_1 - $3_1 | 0;
                HEAP32[(0 + 74644 | 0) >> 2] = $4_1;
                $0_1 = HEAP32[(0 + 74656 | 0) >> 2] | 0;
                $5_1 = $0_1 + $3_1 | 0;
                HEAP32[(0 + 74656 | 0) >> 2] = $5_1;
                HEAP32[($5_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
                HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
                $0_1 = $0_1 + 8 | 0;
                break label$1;
               }
               label$48 : {
                label$49 : {
                 if (!(HEAP32[(0 + 75104 | 0) >> 2] | 0)) {
                  break label$49
                 }
                 $4_1 = HEAP32[(0 + 75112 | 0) >> 2] | 0;
                 break label$48;
                }
                i64toi32_i32$1 = 0;
                i64toi32_i32$0 = -1;
                HEAP32[(i64toi32_i32$1 + 75116 | 0) >> 2] = -1;
                HEAP32[(i64toi32_i32$1 + 75120 | 0) >> 2] = i64toi32_i32$0;
                i64toi32_i32$1 = 0;
                i64toi32_i32$0 = 4096;
                HEAP32[(i64toi32_i32$1 + 75108 | 0) >> 2] = 4096;
                HEAP32[(i64toi32_i32$1 + 75112 | 0) >> 2] = i64toi32_i32$0;
                HEAP32[(0 + 75104 | 0) >> 2] = (($1_1 + 12 | 0) & -16 | 0) ^ 1431655768 | 0;
                HEAP32[(0 + 75124 | 0) >> 2] = 0;
                HEAP32[(0 + 75076 | 0) >> 2] = 0;
                $4_1 = 4096;
               }
               $0_1 = 0;
               $6_1 = $3_1 + 47 | 0;
               $2_1 = $4_1 + $6_1 | 0;
               $11_1 = 0 - $4_1 | 0;
               $8_1 = $2_1 & $11_1 | 0;
               if ($8_1 >>> 0 <= $3_1 >>> 0) {
                break label$1
               }
               $0_1 = 0;
               label$50 : {
                $4_1 = HEAP32[(0 + 75072 | 0) >> 2] | 0;
                if (!$4_1) {
                 break label$50
                }
                $5_1 = HEAP32[(0 + 75064 | 0) >> 2] | 0;
                $9_1 = $5_1 + $8_1 | 0;
                if ($9_1 >>> 0 <= $5_1 >>> 0) {
                 break label$1
                }
                if ($9_1 >>> 0 > $4_1 >>> 0) {
                 break label$1
                }
               }
               label$51 : {
                label$52 : {
                 if ((HEAPU8[(0 + 75076 | 0) >> 0] | 0) & 4 | 0) {
                  break label$52
                 }
                 label$53 : {
                  label$54 : {
                   label$55 : {
                    label$56 : {
                     label$57 : {
                      $4_1 = HEAP32[(0 + 74656 | 0) >> 2] | 0;
                      if (!$4_1) {
                       break label$57
                      }
                      $0_1 = 75080;
                      label$58 : while (1) {
                       label$59 : {
                        $5_1 = HEAP32[$0_1 >> 2] | 0;
                        if ($5_1 >>> 0 > $4_1 >>> 0) {
                         break label$59
                        }
                        if (($5_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0) >>> 0 > $4_1 >>> 0) {
                         break label$56
                        }
                       }
                       $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                       if ($0_1) {
                        continue label$58
                       }
                       break label$58;
                      };
                     }
                     $7_1 = $27(0 | 0) | 0;
                     if (($7_1 | 0) == (-1 | 0)) {
                      break label$53
                     }
                     $2_1 = $8_1;
                     label$60 : {
                      $0_1 = HEAP32[(0 + 75108 | 0) >> 2] | 0;
                      $4_1 = $0_1 + -1 | 0;
                      if (!($4_1 & $7_1 | 0)) {
                       break label$60
                      }
                      $2_1 = ($8_1 - $7_1 | 0) + (($4_1 + $7_1 | 0) & (0 - $0_1 | 0) | 0) | 0;
                     }
                     if ($2_1 >>> 0 <= $3_1 >>> 0) {
                      break label$53
                     }
                     label$61 : {
                      $0_1 = HEAP32[(0 + 75072 | 0) >> 2] | 0;
                      if (!$0_1) {
                       break label$61
                      }
                      $4_1 = HEAP32[(0 + 75064 | 0) >> 2] | 0;
                      $5_1 = $4_1 + $2_1 | 0;
                      if ($5_1 >>> 0 <= $4_1 >>> 0) {
                       break label$53
                      }
                      if ($5_1 >>> 0 > $0_1 >>> 0) {
                       break label$53
                      }
                     }
                     $0_1 = $27($2_1 | 0) | 0;
                     if (($0_1 | 0) != ($7_1 | 0)) {
                      break label$55
                     }
                     break label$51;
                    }
                    $2_1 = ($2_1 - $7_1 | 0) & $11_1 | 0;
                    $7_1 = $27($2_1 | 0) | 0;
                    if (($7_1 | 0) == ((HEAP32[$0_1 >> 2] | 0) + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0 | 0)) {
                     break label$54
                    }
                    $0_1 = $7_1;
                   }
                   if (($0_1 | 0) == (-1 | 0)) {
                    break label$53
                   }
                   label$62 : {
                    if (($3_1 + 48 | 0) >>> 0 > $2_1 >>> 0) {
                     break label$62
                    }
                    $7_1 = $0_1;
                    break label$51;
                   }
                   $4_1 = HEAP32[(0 + 75112 | 0) >> 2] | 0;
                   $4_1 = (($6_1 - $2_1 | 0) + $4_1 | 0) & (0 - $4_1 | 0) | 0;
                   if (($27($4_1 | 0) | 0 | 0) == (-1 | 0)) {
                    break label$53
                   }
                   $2_1 = $4_1 + $2_1 | 0;
                   $7_1 = $0_1;
                   break label$51;
                  }
                  if (($7_1 | 0) != (-1 | 0)) {
                   break label$51
                  }
                 }
                 HEAP32[(0 + 75076 | 0) >> 2] = HEAP32[(0 + 75076 | 0) >> 2] | 0 | 4 | 0;
                }
                $7_1 = $27($8_1 | 0) | 0;
                $0_1 = $27(0 | 0) | 0;
                if (($7_1 | 0) == (-1 | 0)) {
                 break label$9
                }
                if (($0_1 | 0) == (-1 | 0)) {
                 break label$9
                }
                if ($7_1 >>> 0 >= $0_1 >>> 0) {
                 break label$9
                }
                $2_1 = $0_1 - $7_1 | 0;
                if ($2_1 >>> 0 <= ($3_1 + 40 | 0) >>> 0) {
                 break label$9
                }
               }
               $0_1 = (HEAP32[(0 + 75064 | 0) >> 2] | 0) + $2_1 | 0;
               HEAP32[(0 + 75064 | 0) >> 2] = $0_1;
               label$63 : {
                if ($0_1 >>> 0 <= (HEAP32[(0 + 75068 | 0) >> 2] | 0) >>> 0) {
                 break label$63
                }
                HEAP32[(0 + 75068 | 0) >> 2] = $0_1;
               }
               label$64 : {
                label$65 : {
                 $4_1 = HEAP32[(0 + 74656 | 0) >> 2] | 0;
                 if (!$4_1) {
                  break label$65
                 }
                 $0_1 = 75080;
                 label$66 : while (1) {
                  $5_1 = HEAP32[$0_1 >> 2] | 0;
                  $8_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
                  if (($7_1 | 0) == ($5_1 + $8_1 | 0 | 0)) {
                   break label$64
                  }
                  $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                  if ($0_1) {
                   continue label$66
                  }
                  break label$11;
                 };
                }
                label$67 : {
                 label$68 : {
                  $0_1 = HEAP32[(0 + 74648 | 0) >> 2] | 0;
                  if (!$0_1) {
                   break label$68
                  }
                  if ($7_1 >>> 0 >= $0_1 >>> 0) {
                   break label$67
                  }
                 }
                 HEAP32[(0 + 74648 | 0) >> 2] = $7_1;
                }
                $0_1 = 0;
                HEAP32[(0 + 75084 | 0) >> 2] = $2_1;
                HEAP32[(0 + 75080 | 0) >> 2] = $7_1;
                HEAP32[(0 + 74664 | 0) >> 2] = -1;
                HEAP32[(0 + 74668 | 0) >> 2] = HEAP32[(0 + 75104 | 0) >> 2] | 0;
                HEAP32[(0 + 75092 | 0) >> 2] = 0;
                label$69 : while (1) {
                 $4_1 = $0_1 << 3 | 0;
                 $5_1 = $4_1 + 74672 | 0;
                 HEAP32[($4_1 + 74680 | 0) >> 2] = $5_1;
                 HEAP32[($4_1 + 74684 | 0) >> 2] = $5_1;
                 $0_1 = $0_1 + 1 | 0;
                 if (($0_1 | 0) != (32 | 0)) {
                  continue label$69
                 }
                 break label$69;
                };
                $0_1 = $2_1 + -40 | 0;
                $4_1 = ($7_1 + 8 | 0) & 7 | 0 ? (-8 - $7_1 | 0) & 7 | 0 : 0;
                $5_1 = $0_1 - $4_1 | 0;
                HEAP32[(0 + 74644 | 0) >> 2] = $5_1;
                $4_1 = $7_1 + $4_1 | 0;
                HEAP32[(0 + 74656 | 0) >> 2] = $4_1;
                HEAP32[($4_1 + 4 | 0) >> 2] = $5_1 | 1 | 0;
                HEAP32[(($7_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
                HEAP32[(0 + 74660 | 0) >> 2] = HEAP32[(0 + 75120 | 0) >> 2] | 0;
                break label$10;
               }
               if ($4_1 >>> 0 >= $7_1 >>> 0) {
                break label$11
               }
               if ($4_1 >>> 0 < $5_1 >>> 0) {
                break label$11
               }
               if ((HEAP32[($0_1 + 12 | 0) >> 2] | 0) & 8 | 0) {
                break label$11
               }
               HEAP32[($0_1 + 4 | 0) >> 2] = $8_1 + $2_1 | 0;
               $0_1 = ($4_1 + 8 | 0) & 7 | 0 ? (-8 - $4_1 | 0) & 7 | 0 : 0;
               $5_1 = $4_1 + $0_1 | 0;
               HEAP32[(0 + 74656 | 0) >> 2] = $5_1;
               $7_1 = (HEAP32[(0 + 74644 | 0) >> 2] | 0) + $2_1 | 0;
               $0_1 = $7_1 - $0_1 | 0;
               HEAP32[(0 + 74644 | 0) >> 2] = $0_1;
               HEAP32[($5_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
               HEAP32[(($4_1 + $7_1 | 0) + 4 | 0) >> 2] = 40;
               HEAP32[(0 + 74660 | 0) >> 2] = HEAP32[(0 + 75120 | 0) >> 2] | 0;
               break label$10;
              }
              $8_1 = 0;
              break label$2;
             }
             $7_1 = 0;
             break label$3;
            }
            label$70 : {
             $8_1 = HEAP32[(0 + 74648 | 0) >> 2] | 0;
             if ($7_1 >>> 0 >= $8_1 >>> 0) {
              break label$70
             }
             HEAP32[(0 + 74648 | 0) >> 2] = $7_1;
             $8_1 = $7_1;
            }
            $5_1 = $7_1 + $2_1 | 0;
            $0_1 = 75080;
            label$71 : {
             label$72 : {
              label$73 : {
               label$74 : {
                label$75 : while (1) {
                 if ((HEAP32[$0_1 >> 2] | 0 | 0) == ($5_1 | 0)) {
                  break label$74
                 }
                 $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
                 if ($0_1) {
                  continue label$75
                 }
                 break label$73;
                };
               }
               if (!((HEAPU8[($0_1 + 12 | 0) >> 0] | 0) & 8 | 0)) {
                break label$72
               }
              }
              $0_1 = 75080;
              label$76 : while (1) {
               label$77 : {
                $5_1 = HEAP32[$0_1 >> 2] | 0;
                if ($5_1 >>> 0 > $4_1 >>> 0) {
                 break label$77
                }
                $5_1 = $5_1 + (HEAP32[($0_1 + 4 | 0) >> 2] | 0) | 0;
                if ($5_1 >>> 0 > $4_1 >>> 0) {
                 break label$71
                }
               }
               $0_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
               continue label$76;
              };
             }
             HEAP32[$0_1 >> 2] = $7_1;
             HEAP32[($0_1 + 4 | 0) >> 2] = (HEAP32[($0_1 + 4 | 0) >> 2] | 0) + $2_1 | 0;
             $11_1 = $7_1 + (($7_1 + 8 | 0) & 7 | 0 ? (-8 - $7_1 | 0) & 7 | 0 : 0) | 0;
             HEAP32[($11_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
             $2_1 = $5_1 + (($5_1 + 8 | 0) & 7 | 0 ? (-8 - $5_1 | 0) & 7 | 0 : 0) | 0;
             $3_1 = $11_1 + $3_1 | 0;
             $0_1 = $2_1 - $3_1 | 0;
             label$78 : {
              if (($2_1 | 0) != ($4_1 | 0)) {
               break label$78
              }
              HEAP32[(0 + 74656 | 0) >> 2] = $3_1;
              $0_1 = (HEAP32[(0 + 74644 | 0) >> 2] | 0) + $0_1 | 0;
              HEAP32[(0 + 74644 | 0) >> 2] = $0_1;
              HEAP32[($3_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
              break label$4;
             }
             label$79 : {
              if (($2_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
               break label$79
              }
              HEAP32[(0 + 74652 | 0) >> 2] = $3_1;
              $0_1 = (HEAP32[(0 + 74640 | 0) >> 2] | 0) + $0_1 | 0;
              HEAP32[(0 + 74640 | 0) >> 2] = $0_1;
              HEAP32[($3_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
              HEAP32[($3_1 + $0_1 | 0) >> 2] = $0_1;
              break label$4;
             }
             $4_1 = HEAP32[($2_1 + 4 | 0) >> 2] | 0;
             if (($4_1 & 3 | 0 | 0) != (1 | 0)) {
              break label$5
             }
             $6_1 = $4_1 & -8 | 0;
             label$80 : {
              if ($4_1 >>> 0 > 255 >>> 0) {
               break label$80
              }
              $5_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
              $8_1 = $4_1 >>> 3 | 0;
              $7_1 = ($8_1 << 3 | 0) + 74672 | 0;
              label$81 : {
               $4_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
               if (($4_1 | 0) != ($5_1 | 0)) {
                break label$81
               }
               HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $8_1 | 0) | 0) | 0;
               break label$6;
              }
              HEAP32[($5_1 + 12 | 0) >> 2] = $4_1;
              HEAP32[($4_1 + 8 | 0) >> 2] = $5_1;
              break label$6;
             }
             $9_1 = HEAP32[($2_1 + 24 | 0) >> 2] | 0;
             label$82 : {
              $7_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
              if (($7_1 | 0) == ($2_1 | 0)) {
               break label$82
              }
              $4_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
              HEAP32[($4_1 + 12 | 0) >> 2] = $7_1;
              HEAP32[($7_1 + 8 | 0) >> 2] = $4_1;
              break label$7;
             }
             label$83 : {
              $5_1 = $2_1 + 20 | 0;
              $4_1 = HEAP32[$5_1 >> 2] | 0;
              if ($4_1) {
               break label$83
              }
              $4_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
              if (!$4_1) {
               break label$8
              }
              $5_1 = $2_1 + 16 | 0;
             }
             label$84 : while (1) {
              $8_1 = $5_1;
              $7_1 = $4_1;
              $5_1 = $4_1 + 20 | 0;
              $4_1 = HEAP32[$5_1 >> 2] | 0;
              if ($4_1) {
               continue label$84
              }
              $5_1 = $7_1 + 16 | 0;
              $4_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
              if ($4_1) {
               continue label$84
              }
              break label$84;
             };
             HEAP32[$8_1 >> 2] = 0;
             break label$7;
            }
            $0_1 = $2_1 + -40 | 0;
            $8_1 = ($7_1 + 8 | 0) & 7 | 0 ? (-8 - $7_1 | 0) & 7 | 0 : 0;
            $11_1 = $0_1 - $8_1 | 0;
            HEAP32[(0 + 74644 | 0) >> 2] = $11_1;
            $8_1 = $7_1 + $8_1 | 0;
            HEAP32[(0 + 74656 | 0) >> 2] = $8_1;
            HEAP32[($8_1 + 4 | 0) >> 2] = $11_1 | 1 | 0;
            HEAP32[(($7_1 + $0_1 | 0) + 4 | 0) >> 2] = 40;
            HEAP32[(0 + 74660 | 0) >> 2] = HEAP32[(0 + 75120 | 0) >> 2] | 0;
            $0_1 = ($5_1 + (($5_1 + -39 | 0) & 7 | 0 ? (39 - $5_1 | 0) & 7 | 0 : 0) | 0) + -47 | 0;
            $8_1 = $0_1 >>> 0 < ($4_1 + 16 | 0) >>> 0 ? $4_1 : $0_1;
            HEAP32[($8_1 + 4 | 0) >> 2] = 27;
            i64toi32_i32$2 = 0;
            i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 75088 | 0) >> 2] | 0;
            i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 75092 | 0) >> 2] | 0;
            $945 = i64toi32_i32$0;
            i64toi32_i32$0 = $8_1 + 16 | 0;
            HEAP32[i64toi32_i32$0 >> 2] = $945;
            HEAP32[(i64toi32_i32$0 + 4 | 0) >> 2] = i64toi32_i32$1;
            i64toi32_i32$2 = 0;
            i64toi32_i32$1 = HEAP32[(i64toi32_i32$2 + 75080 | 0) >> 2] | 0;
            i64toi32_i32$0 = HEAP32[(i64toi32_i32$2 + 75084 | 0) >> 2] | 0;
            $947 = i64toi32_i32$1;
            i64toi32_i32$1 = $8_1;
            HEAP32[($8_1 + 8 | 0) >> 2] = $947;
            HEAP32[($8_1 + 12 | 0) >> 2] = i64toi32_i32$0;
            HEAP32[(0 + 75088 | 0) >> 2] = $8_1 + 8 | 0;
            HEAP32[(0 + 75084 | 0) >> 2] = $2_1;
            HEAP32[(0 + 75080 | 0) >> 2] = $7_1;
            HEAP32[(0 + 75092 | 0) >> 2] = 0;
            $0_1 = $8_1 + 24 | 0;
            label$85 : while (1) {
             HEAP32[($0_1 + 4 | 0) >> 2] = 7;
             $7_1 = $0_1 + 8 | 0;
             $0_1 = $0_1 + 4 | 0;
             if ($7_1 >>> 0 < $5_1 >>> 0) {
              continue label$85
             }
             break label$85;
            };
            if (($8_1 | 0) == ($4_1 | 0)) {
             break label$10
            }
            HEAP32[($8_1 + 4 | 0) >> 2] = (HEAP32[($8_1 + 4 | 0) >> 2] | 0) & -2 | 0;
            $7_1 = $8_1 - $4_1 | 0;
            HEAP32[($4_1 + 4 | 0) >> 2] = $7_1 | 1 | 0;
            HEAP32[$8_1 >> 2] = $7_1;
            label$86 : {
             if ($7_1 >>> 0 > 255 >>> 0) {
              break label$86
             }
             $0_1 = ($7_1 & -8 | 0) + 74672 | 0;
             label$87 : {
              label$88 : {
               $5_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
               $7_1 = 1 << ($7_1 >>> 3 | 0) | 0;
               if ($5_1 & $7_1 | 0) {
                break label$88
               }
               HEAP32[(0 + 74632 | 0) >> 2] = $5_1 | $7_1 | 0;
               $5_1 = $0_1;
               break label$87;
              }
              $5_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
             }
             HEAP32[($0_1 + 8 | 0) >> 2] = $4_1;
             HEAP32[($5_1 + 12 | 0) >> 2] = $4_1;
             HEAP32[($4_1 + 12 | 0) >> 2] = $0_1;
             HEAP32[($4_1 + 8 | 0) >> 2] = $5_1;
             break label$10;
            }
            $0_1 = 31;
            label$89 : {
             if ($7_1 >>> 0 > 16777215 >>> 0) {
              break label$89
             }
             $0_1 = Math_clz32($7_1 >>> 8 | 0);
             $0_1 = ((($7_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
            }
            HEAP32[($4_1 + 28 | 0) >> 2] = $0_1;
            i64toi32_i32$1 = $4_1;
            i64toi32_i32$0 = 0;
            HEAP32[($4_1 + 16 | 0) >> 2] = 0;
            HEAP32[($4_1 + 20 | 0) >> 2] = i64toi32_i32$0;
            $5_1 = ($0_1 << 2 | 0) + 74936 | 0;
            label$90 : {
             label$91 : {
              label$92 : {
               $8_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
               $2_1 = 1 << $0_1 | 0;
               if ($8_1 & $2_1 | 0) {
                break label$92
               }
               HEAP32[(0 + 74636 | 0) >> 2] = $8_1 | $2_1 | 0;
               HEAP32[$5_1 >> 2] = $4_1;
               HEAP32[($4_1 + 24 | 0) >> 2] = $5_1;
               break label$91;
              }
              $0_1 = $7_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
              $8_1 = HEAP32[$5_1 >> 2] | 0;
              label$93 : while (1) {
               $5_1 = $8_1;
               if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($7_1 | 0)) {
                break label$90
               }
               $8_1 = $0_1 >>> 29 | 0;
               $0_1 = $0_1 << 1 | 0;
               $2_1 = ($5_1 + ($8_1 & 4 | 0) | 0) + 16 | 0;
               $8_1 = HEAP32[$2_1 >> 2] | 0;
               if ($8_1) {
                continue label$93
               }
               break label$93;
              };
              HEAP32[$2_1 >> 2] = $4_1;
              HEAP32[($4_1 + 24 | 0) >> 2] = $5_1;
             }
             HEAP32[($4_1 + 12 | 0) >> 2] = $4_1;
             HEAP32[($4_1 + 8 | 0) >> 2] = $4_1;
             break label$10;
            }
            $0_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
            HEAP32[($0_1 + 12 | 0) >> 2] = $4_1;
            HEAP32[($5_1 + 8 | 0) >> 2] = $4_1;
            HEAP32[($4_1 + 24 | 0) >> 2] = 0;
            HEAP32[($4_1 + 12 | 0) >> 2] = $5_1;
            HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
           }
           $0_1 = HEAP32[(0 + 74644 | 0) >> 2] | 0;
           if ($0_1 >>> 0 <= $3_1 >>> 0) {
            break label$9
           }
           $4_1 = $0_1 - $3_1 | 0;
           HEAP32[(0 + 74644 | 0) >> 2] = $4_1;
           $0_1 = HEAP32[(0 + 74656 | 0) >> 2] | 0;
           $5_1 = $0_1 + $3_1 | 0;
           HEAP32[(0 + 74656 | 0) >> 2] = $5_1;
           HEAP32[($5_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
           HEAP32[($0_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
           $0_1 = $0_1 + 8 | 0;
           break label$1;
          }
          HEAP32[($26() | 0) >> 2] = 48;
          $0_1 = 0;
          break label$1;
         }
         $7_1 = 0;
        }
        if (!$9_1) {
         break label$6
        }
        label$94 : {
         label$95 : {
          $5_1 = HEAP32[($2_1 + 28 | 0) >> 2] | 0;
          $4_1 = ($5_1 << 2 | 0) + 74936 | 0;
          if (($2_1 | 0) != (HEAP32[$4_1 >> 2] | 0 | 0)) {
           break label$95
          }
          HEAP32[$4_1 >> 2] = $7_1;
          if ($7_1) {
           break label$94
          }
          HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
          break label$6;
         }
         HEAP32[($9_1 + ((HEAP32[($9_1 + 16 | 0) >> 2] | 0 | 0) == ($2_1 | 0) ? 16 : 20) | 0) >> 2] = $7_1;
         if (!$7_1) {
          break label$6
         }
        }
        HEAP32[($7_1 + 24 | 0) >> 2] = $9_1;
        label$96 : {
         $4_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
         if (!$4_1) {
          break label$96
         }
         HEAP32[($7_1 + 16 | 0) >> 2] = $4_1;
         HEAP32[($4_1 + 24 | 0) >> 2] = $7_1;
        }
        $4_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
        if (!$4_1) {
         break label$6
        }
        HEAP32[($7_1 + 20 | 0) >> 2] = $4_1;
        HEAP32[($4_1 + 24 | 0) >> 2] = $7_1;
       }
       $0_1 = $6_1 + $0_1 | 0;
       $2_1 = $2_1 + $6_1 | 0;
       $4_1 = HEAP32[($2_1 + 4 | 0) >> 2] | 0;
      }
      HEAP32[($2_1 + 4 | 0) >> 2] = $4_1 & -2 | 0;
      HEAP32[($3_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
      HEAP32[($3_1 + $0_1 | 0) >> 2] = $0_1;
      label$97 : {
       if ($0_1 >>> 0 > 255 >>> 0) {
        break label$97
       }
       $4_1 = ($0_1 & -8 | 0) + 74672 | 0;
       label$98 : {
        label$99 : {
         $5_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
         $0_1 = 1 << ($0_1 >>> 3 | 0) | 0;
         if ($5_1 & $0_1 | 0) {
          break label$99
         }
         HEAP32[(0 + 74632 | 0) >> 2] = $5_1 | $0_1 | 0;
         $0_1 = $4_1;
         break label$98;
        }
        $0_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
       }
       HEAP32[($4_1 + 8 | 0) >> 2] = $3_1;
       HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
       HEAP32[($3_1 + 12 | 0) >> 2] = $4_1;
       HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
       break label$4;
      }
      $4_1 = 31;
      label$100 : {
       if ($0_1 >>> 0 > 16777215 >>> 0) {
        break label$100
       }
       $4_1 = Math_clz32($0_1 >>> 8 | 0);
       $4_1 = ((($0_1 >>> (38 - $4_1 | 0) | 0) & 1 | 0) - ($4_1 << 1 | 0) | 0) + 62 | 0;
      }
      HEAP32[($3_1 + 28 | 0) >> 2] = $4_1;
      i64toi32_i32$1 = $3_1;
      i64toi32_i32$0 = 0;
      HEAP32[($3_1 + 16 | 0) >> 2] = 0;
      HEAP32[($3_1 + 20 | 0) >> 2] = i64toi32_i32$0;
      $5_1 = ($4_1 << 2 | 0) + 74936 | 0;
      label$101 : {
       label$102 : {
        label$103 : {
         $7_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
         $8_1 = 1 << $4_1 | 0;
         if ($7_1 & $8_1 | 0) {
          break label$103
         }
         HEAP32[(0 + 74636 | 0) >> 2] = $7_1 | $8_1 | 0;
         HEAP32[$5_1 >> 2] = $3_1;
         HEAP32[($3_1 + 24 | 0) >> 2] = $5_1;
         break label$102;
        }
        $4_1 = $0_1 << (($4_1 | 0) == (31 | 0) ? 0 : 25 - ($4_1 >>> 1 | 0) | 0) | 0;
        $7_1 = HEAP32[$5_1 >> 2] | 0;
        label$104 : while (1) {
         $5_1 = $7_1;
         if (((HEAP32[($7_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
          break label$101
         }
         $7_1 = $4_1 >>> 29 | 0;
         $4_1 = $4_1 << 1 | 0;
         $8_1 = ($5_1 + ($7_1 & 4 | 0) | 0) + 16 | 0;
         $7_1 = HEAP32[$8_1 >> 2] | 0;
         if ($7_1) {
          continue label$104
         }
         break label$104;
        };
        HEAP32[$8_1 >> 2] = $3_1;
        HEAP32[($3_1 + 24 | 0) >> 2] = $5_1;
       }
       HEAP32[($3_1 + 12 | 0) >> 2] = $3_1;
       HEAP32[($3_1 + 8 | 0) >> 2] = $3_1;
       break label$4;
      }
      $0_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
      HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
      HEAP32[($5_1 + 8 | 0) >> 2] = $3_1;
      HEAP32[($3_1 + 24 | 0) >> 2] = 0;
      HEAP32[($3_1 + 12 | 0) >> 2] = $5_1;
      HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
     }
     $0_1 = $11_1 + 8 | 0;
     break label$1;
    }
    label$105 : {
     if (!$11_1) {
      break label$105
     }
     label$106 : {
      label$107 : {
       $5_1 = HEAP32[($8_1 + 28 | 0) >> 2] | 0;
       $0_1 = ($5_1 << 2 | 0) + 74936 | 0;
       if (($8_1 | 0) != (HEAP32[$0_1 >> 2] | 0 | 0)) {
        break label$107
       }
       HEAP32[$0_1 >> 2] = $7_1;
       if ($7_1) {
        break label$106
       }
       $6_1 = $6_1 & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
       HEAP32[(0 + 74636 | 0) >> 2] = $6_1;
       break label$105;
      }
      HEAP32[($11_1 + ((HEAP32[($11_1 + 16 | 0) >> 2] | 0 | 0) == ($8_1 | 0) ? 16 : 20) | 0) >> 2] = $7_1;
      if (!$7_1) {
       break label$105
      }
     }
     HEAP32[($7_1 + 24 | 0) >> 2] = $11_1;
     label$108 : {
      $0_1 = HEAP32[($8_1 + 16 | 0) >> 2] | 0;
      if (!$0_1) {
       break label$108
      }
      HEAP32[($7_1 + 16 | 0) >> 2] = $0_1;
      HEAP32[($0_1 + 24 | 0) >> 2] = $7_1;
     }
     $0_1 = HEAP32[($8_1 + 20 | 0) >> 2] | 0;
     if (!$0_1) {
      break label$105
     }
     HEAP32[($7_1 + 20 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 24 | 0) >> 2] = $7_1;
    }
    label$109 : {
     label$110 : {
      if ($4_1 >>> 0 > 15 >>> 0) {
       break label$110
      }
      $0_1 = $4_1 + $3_1 | 0;
      HEAP32[($8_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
      $0_1 = $8_1 + $0_1 | 0;
      HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
      break label$109;
     }
     HEAP32[($8_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
     $7_1 = $8_1 + $3_1 | 0;
     HEAP32[($7_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
     HEAP32[($7_1 + $4_1 | 0) >> 2] = $4_1;
     label$111 : {
      if ($4_1 >>> 0 > 255 >>> 0) {
       break label$111
      }
      $0_1 = ($4_1 & -8 | 0) + 74672 | 0;
      label$112 : {
       label$113 : {
        $5_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
        $4_1 = 1 << ($4_1 >>> 3 | 0) | 0;
        if ($5_1 & $4_1 | 0) {
         break label$113
        }
        HEAP32[(0 + 74632 | 0) >> 2] = $5_1 | $4_1 | 0;
        $4_1 = $0_1;
        break label$112;
       }
       $4_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
      }
      HEAP32[($0_1 + 8 | 0) >> 2] = $7_1;
      HEAP32[($4_1 + 12 | 0) >> 2] = $7_1;
      HEAP32[($7_1 + 12 | 0) >> 2] = $0_1;
      HEAP32[($7_1 + 8 | 0) >> 2] = $4_1;
      break label$109;
     }
     $0_1 = 31;
     label$114 : {
      if ($4_1 >>> 0 > 16777215 >>> 0) {
       break label$114
      }
      $0_1 = Math_clz32($4_1 >>> 8 | 0);
      $0_1 = ((($4_1 >>> (38 - $0_1 | 0) | 0) & 1 | 0) - ($0_1 << 1 | 0) | 0) + 62 | 0;
     }
     HEAP32[($7_1 + 28 | 0) >> 2] = $0_1;
     i64toi32_i32$1 = $7_1;
     i64toi32_i32$0 = 0;
     HEAP32[($7_1 + 16 | 0) >> 2] = 0;
     HEAP32[($7_1 + 20 | 0) >> 2] = i64toi32_i32$0;
     $5_1 = ($0_1 << 2 | 0) + 74936 | 0;
     label$115 : {
      label$116 : {
       label$117 : {
        $3_1 = 1 << $0_1 | 0;
        if ($6_1 & $3_1 | 0) {
         break label$117
        }
        HEAP32[(0 + 74636 | 0) >> 2] = $6_1 | $3_1 | 0;
        HEAP32[$5_1 >> 2] = $7_1;
        HEAP32[($7_1 + 24 | 0) >> 2] = $5_1;
        break label$116;
       }
       $0_1 = $4_1 << (($0_1 | 0) == (31 | 0) ? 0 : 25 - ($0_1 >>> 1 | 0) | 0) | 0;
       $3_1 = HEAP32[$5_1 >> 2] | 0;
       label$118 : while (1) {
        $5_1 = $3_1;
        if (((HEAP32[($5_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($4_1 | 0)) {
         break label$115
        }
        $3_1 = $0_1 >>> 29 | 0;
        $0_1 = $0_1 << 1 | 0;
        $2_1 = ($5_1 + ($3_1 & 4 | 0) | 0) + 16 | 0;
        $3_1 = HEAP32[$2_1 >> 2] | 0;
        if ($3_1) {
         continue label$118
        }
        break label$118;
       };
       HEAP32[$2_1 >> 2] = $7_1;
       HEAP32[($7_1 + 24 | 0) >> 2] = $5_1;
      }
      HEAP32[($7_1 + 12 | 0) >> 2] = $7_1;
      HEAP32[($7_1 + 8 | 0) >> 2] = $7_1;
      break label$109;
     }
     $0_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
     HEAP32[($0_1 + 12 | 0) >> 2] = $7_1;
     HEAP32[($5_1 + 8 | 0) >> 2] = $7_1;
     HEAP32[($7_1 + 24 | 0) >> 2] = 0;
     HEAP32[($7_1 + 12 | 0) >> 2] = $5_1;
     HEAP32[($7_1 + 8 | 0) >> 2] = $0_1;
    }
    $0_1 = $8_1 + 8 | 0;
    break label$1;
   }
   label$119 : {
    if (!$10_1) {
     break label$119
    }
    label$120 : {
     label$121 : {
      $5_1 = HEAP32[($7_1 + 28 | 0) >> 2] | 0;
      $0_1 = ($5_1 << 2 | 0) + 74936 | 0;
      if (($7_1 | 0) != (HEAP32[$0_1 >> 2] | 0 | 0)) {
       break label$121
      }
      HEAP32[$0_1 >> 2] = $8_1;
      if ($8_1) {
       break label$120
      }
      HEAP32[(0 + 74636 | 0) >> 2] = $9_1 & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
      break label$119;
     }
     HEAP32[($10_1 + ((HEAP32[($10_1 + 16 | 0) >> 2] | 0 | 0) == ($7_1 | 0) ? 16 : 20) | 0) >> 2] = $8_1;
     if (!$8_1) {
      break label$119
     }
    }
    HEAP32[($8_1 + 24 | 0) >> 2] = $10_1;
    label$122 : {
     $0_1 = HEAP32[($7_1 + 16 | 0) >> 2] | 0;
     if (!$0_1) {
      break label$122
     }
     HEAP32[($8_1 + 16 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 24 | 0) >> 2] = $8_1;
    }
    $0_1 = HEAP32[($7_1 + 20 | 0) >> 2] | 0;
    if (!$0_1) {
     break label$119
    }
    HEAP32[($8_1 + 20 | 0) >> 2] = $0_1;
    HEAP32[($0_1 + 24 | 0) >> 2] = $8_1;
   }
   label$123 : {
    label$124 : {
     if ($4_1 >>> 0 > 15 >>> 0) {
      break label$124
     }
     $0_1 = $4_1 + $3_1 | 0;
     HEAP32[($7_1 + 4 | 0) >> 2] = $0_1 | 3 | 0;
     $0_1 = $7_1 + $0_1 | 0;
     HEAP32[($0_1 + 4 | 0) >> 2] = HEAP32[($0_1 + 4 | 0) >> 2] | 0 | 1 | 0;
     break label$123;
    }
    HEAP32[($7_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
    $5_1 = $7_1 + $3_1 | 0;
    HEAP32[($5_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
    HEAP32[($5_1 + $4_1 | 0) >> 2] = $4_1;
    label$125 : {
     if (!$6_1) {
      break label$125
     }
     $3_1 = ($6_1 & -8 | 0) + 74672 | 0;
     $0_1 = HEAP32[(0 + 74652 | 0) >> 2] | 0;
     label$126 : {
      label$127 : {
       $8_1 = 1 << ($6_1 >>> 3 | 0) | 0;
       if ($8_1 & $2_1 | 0) {
        break label$127
       }
       HEAP32[(0 + 74632 | 0) >> 2] = $8_1 | $2_1 | 0;
       $8_1 = $3_1;
       break label$126;
      }
      $8_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
     }
     HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
     HEAP32[($8_1 + 12 | 0) >> 2] = $0_1;
     HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
     HEAP32[($0_1 + 8 | 0) >> 2] = $8_1;
    }
    HEAP32[(0 + 74652 | 0) >> 2] = $5_1;
    HEAP32[(0 + 74640 | 0) >> 2] = $4_1;
   }
   $0_1 = $7_1 + 8 | 0;
  }
  global$0 = $1_1 + 16 | 0;
  return $0_1 | 0;
 }
 
 function $29($0_1) {
  $0_1 = $0_1 | 0;
  var $2_1 = 0, $1_1 = 0, $6_1 = 0, $4_1 = 0, $3_1 = 0, $5_1 = 0, $7_1 = 0;
  label$1 : {
   if (!$0_1) {
    break label$1
   }
   $1_1 = $0_1 + -8 | 0;
   $2_1 = HEAP32[($0_1 + -4 | 0) >> 2] | 0;
   $0_1 = $2_1 & -8 | 0;
   $3_1 = $1_1 + $0_1 | 0;
   label$2 : {
    if ($2_1 & 1 | 0) {
     break label$2
    }
    if (!($2_1 & 3 | 0)) {
     break label$1
    }
    $2_1 = HEAP32[$1_1 >> 2] | 0;
    $1_1 = $1_1 - $2_1 | 0;
    $4_1 = HEAP32[(0 + 74648 | 0) >> 2] | 0;
    if ($1_1 >>> 0 < $4_1 >>> 0) {
     break label$1
    }
    $0_1 = $2_1 + $0_1 | 0;
    label$3 : {
     label$4 : {
      label$5 : {
       if (($1_1 | 0) == (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
        break label$5
       }
       label$6 : {
        if ($2_1 >>> 0 > 255 >>> 0) {
         break label$6
        }
        $4_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
        $5_1 = $2_1 >>> 3 | 0;
        $6_1 = ($5_1 << 3 | 0) + 74672 | 0;
        label$7 : {
         $2_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
         if (($2_1 | 0) != ($4_1 | 0)) {
          break label$7
         }
         HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
         break label$2;
        }
        HEAP32[($4_1 + 12 | 0) >> 2] = $2_1;
        HEAP32[($2_1 + 8 | 0) >> 2] = $4_1;
        break label$2;
       }
       $7_1 = HEAP32[($1_1 + 24 | 0) >> 2] | 0;
       label$8 : {
        $6_1 = HEAP32[($1_1 + 12 | 0) >> 2] | 0;
        if (($6_1 | 0) == ($1_1 | 0)) {
         break label$8
        }
        $2_1 = HEAP32[($1_1 + 8 | 0) >> 2] | 0;
        HEAP32[($2_1 + 12 | 0) >> 2] = $6_1;
        HEAP32[($6_1 + 8 | 0) >> 2] = $2_1;
        break label$3;
       }
       label$9 : {
        $4_1 = $1_1 + 20 | 0;
        $2_1 = HEAP32[$4_1 >> 2] | 0;
        if ($2_1) {
         break label$9
        }
        $2_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
        if (!$2_1) {
         break label$4
        }
        $4_1 = $1_1 + 16 | 0;
       }
       label$10 : while (1) {
        $5_1 = $4_1;
        $6_1 = $2_1;
        $4_1 = $2_1 + 20 | 0;
        $2_1 = HEAP32[$4_1 >> 2] | 0;
        if ($2_1) {
         continue label$10
        }
        $4_1 = $6_1 + 16 | 0;
        $2_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
        if ($2_1) {
         continue label$10
        }
        break label$10;
       };
       HEAP32[$5_1 >> 2] = 0;
       break label$3;
      }
      $2_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
      if (($2_1 & 3 | 0 | 0) != (3 | 0)) {
       break label$2
      }
      HEAP32[(0 + 74640 | 0) >> 2] = $0_1;
      HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 & -2 | 0;
      HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
      HEAP32[$3_1 >> 2] = $0_1;
      return;
     }
     $6_1 = 0;
    }
    if (!$7_1) {
     break label$2
    }
    label$11 : {
     label$12 : {
      $4_1 = HEAP32[($1_1 + 28 | 0) >> 2] | 0;
      $2_1 = ($4_1 << 2 | 0) + 74936 | 0;
      if (($1_1 | 0) != (HEAP32[$2_1 >> 2] | 0 | 0)) {
       break label$12
      }
      HEAP32[$2_1 >> 2] = $6_1;
      if ($6_1) {
       break label$11
      }
      HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
      break label$2;
     }
     HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($1_1 | 0) ? 16 : 20) | 0) >> 2] = $6_1;
     if (!$6_1) {
      break label$2
     }
    }
    HEAP32[($6_1 + 24 | 0) >> 2] = $7_1;
    label$13 : {
     $2_1 = HEAP32[($1_1 + 16 | 0) >> 2] | 0;
     if (!$2_1) {
      break label$13
     }
     HEAP32[($6_1 + 16 | 0) >> 2] = $2_1;
     HEAP32[($2_1 + 24 | 0) >> 2] = $6_1;
    }
    $2_1 = HEAP32[($1_1 + 20 | 0) >> 2] | 0;
    if (!$2_1) {
     break label$2
    }
    HEAP32[($6_1 + 20 | 0) >> 2] = $2_1;
    HEAP32[($2_1 + 24 | 0) >> 2] = $6_1;
   }
   if ($1_1 >>> 0 >= $3_1 >>> 0) {
    break label$1
   }
   $2_1 = HEAP32[($3_1 + 4 | 0) >> 2] | 0;
   if (!($2_1 & 1 | 0)) {
    break label$1
   }
   label$14 : {
    label$15 : {
     label$16 : {
      label$17 : {
       label$18 : {
        if ($2_1 & 2 | 0) {
         break label$18
        }
        label$19 : {
         if (($3_1 | 0) != (HEAP32[(0 + 74656 | 0) >> 2] | 0 | 0)) {
          break label$19
         }
         HEAP32[(0 + 74656 | 0) >> 2] = $1_1;
         $0_1 = (HEAP32[(0 + 74644 | 0) >> 2] | 0) + $0_1 | 0;
         HEAP32[(0 + 74644 | 0) >> 2] = $0_1;
         HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
         if (($1_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
          break label$1
         }
         HEAP32[(0 + 74640 | 0) >> 2] = 0;
         HEAP32[(0 + 74652 | 0) >> 2] = 0;
         return;
        }
        label$20 : {
         if (($3_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
          break label$20
         }
         HEAP32[(0 + 74652 | 0) >> 2] = $1_1;
         $0_1 = (HEAP32[(0 + 74640 | 0) >> 2] | 0) + $0_1 | 0;
         HEAP32[(0 + 74640 | 0) >> 2] = $0_1;
         HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
         HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
         return;
        }
        $0_1 = ($2_1 & -8 | 0) + $0_1 | 0;
        label$21 : {
         if ($2_1 >>> 0 > 255 >>> 0) {
          break label$21
         }
         $4_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         $5_1 = $2_1 >>> 3 | 0;
         $6_1 = ($5_1 << 3 | 0) + 74672 | 0;
         label$22 : {
          $2_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
          if (($2_1 | 0) != ($4_1 | 0)) {
           break label$22
          }
          HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
          break label$15;
         }
         HEAP32[($4_1 + 12 | 0) >> 2] = $2_1;
         HEAP32[($2_1 + 8 | 0) >> 2] = $4_1;
         break label$15;
        }
        $7_1 = HEAP32[($3_1 + 24 | 0) >> 2] | 0;
        label$23 : {
         $6_1 = HEAP32[($3_1 + 12 | 0) >> 2] | 0;
         if (($6_1 | 0) == ($3_1 | 0)) {
          break label$23
         }
         $2_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
         HEAP32[(0 + 74648 | 0) >> 2] | 0;
         HEAP32[($2_1 + 12 | 0) >> 2] = $6_1;
         HEAP32[($6_1 + 8 | 0) >> 2] = $2_1;
         break label$16;
        }
        label$24 : {
         $4_1 = $3_1 + 20 | 0;
         $2_1 = HEAP32[$4_1 >> 2] | 0;
         if ($2_1) {
          break label$24
         }
         $2_1 = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
         if (!$2_1) {
          break label$17
         }
         $4_1 = $3_1 + 16 | 0;
        }
        label$25 : while (1) {
         $5_1 = $4_1;
         $6_1 = $2_1;
         $4_1 = $2_1 + 20 | 0;
         $2_1 = HEAP32[$4_1 >> 2] | 0;
         if ($2_1) {
          continue label$25
         }
         $4_1 = $6_1 + 16 | 0;
         $2_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
         if ($2_1) {
          continue label$25
         }
         break label$25;
        };
        HEAP32[$5_1 >> 2] = 0;
        break label$16;
       }
       HEAP32[($3_1 + 4 | 0) >> 2] = $2_1 & -2 | 0;
       HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
       HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
       break label$14;
      }
      $6_1 = 0;
     }
     if (!$7_1) {
      break label$15
     }
     label$26 : {
      label$27 : {
       $4_1 = HEAP32[($3_1 + 28 | 0) >> 2] | 0;
       $2_1 = ($4_1 << 2 | 0) + 74936 | 0;
       if (($3_1 | 0) != (HEAP32[$2_1 >> 2] | 0 | 0)) {
        break label$27
       }
       HEAP32[$2_1 >> 2] = $6_1;
       if ($6_1) {
        break label$26
       }
       HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
       break label$15;
      }
      HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($3_1 | 0) ? 16 : 20) | 0) >> 2] = $6_1;
      if (!$6_1) {
       break label$15
      }
     }
     HEAP32[($6_1 + 24 | 0) >> 2] = $7_1;
     label$28 : {
      $2_1 = HEAP32[($3_1 + 16 | 0) >> 2] | 0;
      if (!$2_1) {
       break label$28
      }
      HEAP32[($6_1 + 16 | 0) >> 2] = $2_1;
      HEAP32[($2_1 + 24 | 0) >> 2] = $6_1;
     }
     $2_1 = HEAP32[($3_1 + 20 | 0) >> 2] | 0;
     if (!$2_1) {
      break label$15
     }
     HEAP32[($6_1 + 20 | 0) >> 2] = $2_1;
     HEAP32[($2_1 + 24 | 0) >> 2] = $6_1;
    }
    HEAP32[($1_1 + 4 | 0) >> 2] = $0_1 | 1 | 0;
    HEAP32[($1_1 + $0_1 | 0) >> 2] = $0_1;
    if (($1_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
     break label$14
    }
    HEAP32[(0 + 74640 | 0) >> 2] = $0_1;
    return;
   }
   label$29 : {
    if ($0_1 >>> 0 > 255 >>> 0) {
     break label$29
    }
    $2_1 = ($0_1 & -8 | 0) + 74672 | 0;
    label$30 : {
     label$31 : {
      $4_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
      $0_1 = 1 << ($0_1 >>> 3 | 0) | 0;
      if ($4_1 & $0_1 | 0) {
       break label$31
      }
      HEAP32[(0 + 74632 | 0) >> 2] = $4_1 | $0_1 | 0;
      $0_1 = $2_1;
      break label$30;
     }
     $0_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($2_1 + 8 | 0) >> 2] = $1_1;
    HEAP32[($0_1 + 12 | 0) >> 2] = $1_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = $2_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $0_1;
    return;
   }
   $2_1 = 31;
   label$32 : {
    if ($0_1 >>> 0 > 16777215 >>> 0) {
     break label$32
    }
    $2_1 = Math_clz32($0_1 >>> 8 | 0);
    $2_1 = ((($0_1 >>> (38 - $2_1 | 0) | 0) & 1 | 0) - ($2_1 << 1 | 0) | 0) + 62 | 0;
   }
   HEAP32[($1_1 + 28 | 0) >> 2] = $2_1;
   HEAP32[($1_1 + 16 | 0) >> 2] = 0;
   HEAP32[($1_1 + 20 | 0) >> 2] = 0;
   $4_1 = ($2_1 << 2 | 0) + 74936 | 0;
   label$33 : {
    label$34 : {
     label$35 : {
      label$36 : {
       $6_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
       $3_1 = 1 << $2_1 | 0;
       if ($6_1 & $3_1 | 0) {
        break label$36
       }
       HEAP32[(0 + 74636 | 0) >> 2] = $6_1 | $3_1 | 0;
       HEAP32[$4_1 >> 2] = $1_1;
       HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
       break label$35;
      }
      $2_1 = $0_1 << (($2_1 | 0) == (31 | 0) ? 0 : 25 - ($2_1 >>> 1 | 0) | 0) | 0;
      $6_1 = HEAP32[$4_1 >> 2] | 0;
      label$37 : while (1) {
       $4_1 = $6_1;
       if (((HEAP32[($6_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($0_1 | 0)) {
        break label$34
       }
       $6_1 = $2_1 >>> 29 | 0;
       $2_1 = $2_1 << 1 | 0;
       $3_1 = ($4_1 + ($6_1 & 4 | 0) | 0) + 16 | 0;
       $6_1 = HEAP32[$3_1 >> 2] | 0;
       if ($6_1) {
        continue label$37
       }
       break label$37;
      };
      HEAP32[$3_1 >> 2] = $1_1;
      HEAP32[($1_1 + 24 | 0) >> 2] = $4_1;
     }
     HEAP32[($1_1 + 12 | 0) >> 2] = $1_1;
     HEAP32[($1_1 + 8 | 0) >> 2] = $1_1;
     break label$33;
    }
    $0_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
    HEAP32[($0_1 + 12 | 0) >> 2] = $1_1;
    HEAP32[($4_1 + 8 | 0) >> 2] = $1_1;
    HEAP32[($1_1 + 24 | 0) >> 2] = 0;
    HEAP32[($1_1 + 12 | 0) >> 2] = $4_1;
    HEAP32[($1_1 + 8 | 0) >> 2] = $0_1;
   }
   $1_1 = (HEAP32[(0 + 74664 | 0) >> 2] | 0) + -1 | 0;
   HEAP32[(0 + 74664 | 0) >> 2] = $1_1 ? $1_1 : -1;
  }
 }
 
 function $30($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $2_1 = 0, $3_1 = 0;
  label$1 : {
   if ($0_1) {
    break label$1
   }
   return $28($1_1 | 0) | 0 | 0;
  }
  label$2 : {
   if ($1_1 >>> 0 < -64 >>> 0) {
    break label$2
   }
   HEAP32[($26() | 0) >> 2] = 48;
   return 0 | 0;
  }
  label$3 : {
   $2_1 = $31($0_1 + -8 | 0 | 0, ($1_1 >>> 0 < 11 >>> 0 ? 16 : ($1_1 + 11 | 0) & -8 | 0) | 0) | 0;
   if (!$2_1) {
    break label$3
   }
   return $2_1 + 8 | 0 | 0;
  }
  label$4 : {
   $2_1 = $28($1_1 | 0) | 0;
   if ($2_1) {
    break label$4
   }
   return 0 | 0;
  }
  $3_1 = HEAP32[($0_1 + -4 | 0) >> 2] | 0;
  $3_1 = ($3_1 & 3 | 0 ? -4 : -8) + ($3_1 & -8 | 0) | 0;
  $24($2_1 | 0, $0_1 | 0, ($3_1 >>> 0 < $1_1 >>> 0 ? $3_1 : $1_1) | 0) | 0;
  $29($0_1 | 0);
  return $2_1 | 0;
 }
 
 function $31($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $3_1 = 0, $4_1 = 0, $6_1 = 0, $5_1 = 0, $2_1 = 0, $7_1 = 0, $9_1 = 0, $10_1 = 0, $8_1 = 0;
  $2_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
  $3_1 = $2_1 & -8 | 0;
  label$1 : {
   label$2 : {
    if ($2_1 & 3 | 0) {
     break label$2
    }
    label$3 : {
     if ($1_1 >>> 0 >= 256 >>> 0) {
      break label$3
     }
     return 0 | 0;
    }
    label$4 : {
     if ($3_1 >>> 0 < ($1_1 + 4 | 0) >>> 0) {
      break label$4
     }
     $4_1 = $0_1;
     if (($3_1 - $1_1 | 0) >>> 0 <= ((HEAP32[(0 + 75112 | 0) >> 2] | 0) << 1 | 0) >>> 0) {
      break label$1
     }
    }
    return 0 | 0;
   }
   $5_1 = $0_1 + $3_1 | 0;
   label$5 : {
    label$6 : {
     if ($3_1 >>> 0 < $1_1 >>> 0) {
      break label$6
     }
     $3_1 = $3_1 - $1_1 | 0;
     if ($3_1 >>> 0 < 16 >>> 0) {
      break label$5
     }
     HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $1_1 | 0 | 2 | 0;
     $1_1 = $0_1 + $1_1 | 0;
     HEAP32[($1_1 + 4 | 0) >> 2] = $3_1 | 3 | 0;
     HEAP32[($5_1 + 4 | 0) >> 2] = HEAP32[($5_1 + 4 | 0) >> 2] | 0 | 1 | 0;
     $32($1_1 | 0, $3_1 | 0);
     break label$5;
    }
    $4_1 = 0;
    label$7 : {
     if (($5_1 | 0) != (HEAP32[(0 + 74656 | 0) >> 2] | 0 | 0)) {
      break label$7
     }
     $3_1 = (HEAP32[(0 + 74644 | 0) >> 2] | 0) + $3_1 | 0;
     if ($3_1 >>> 0 <= $1_1 >>> 0) {
      break label$1
     }
     HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $1_1 | 0 | 2 | 0;
     $2_1 = $0_1 + $1_1 | 0;
     $1_1 = $3_1 - $1_1 | 0;
     HEAP32[($2_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
     HEAP32[(0 + 74644 | 0) >> 2] = $1_1;
     HEAP32[(0 + 74656 | 0) >> 2] = $2_1;
     break label$5;
    }
    label$8 : {
     if (($5_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
      break label$8
     }
     $4_1 = 0;
     $3_1 = (HEAP32[(0 + 74640 | 0) >> 2] | 0) + $3_1 | 0;
     if ($3_1 >>> 0 < $1_1 >>> 0) {
      break label$1
     }
     label$9 : {
      label$10 : {
       $4_1 = $3_1 - $1_1 | 0;
       if ($4_1 >>> 0 < 16 >>> 0) {
        break label$10
       }
       HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $1_1 | 0 | 2 | 0;
       $1_1 = $0_1 + $1_1 | 0;
       HEAP32[($1_1 + 4 | 0) >> 2] = $4_1 | 1 | 0;
       $3_1 = $0_1 + $3_1 | 0;
       HEAP32[$3_1 >> 2] = $4_1;
       HEAP32[($3_1 + 4 | 0) >> 2] = (HEAP32[($3_1 + 4 | 0) >> 2] | 0) & -2 | 0;
       break label$9;
      }
      HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $3_1 | 0 | 2 | 0;
      $1_1 = $0_1 + $3_1 | 0;
      HEAP32[($1_1 + 4 | 0) >> 2] = HEAP32[($1_1 + 4 | 0) >> 2] | 0 | 1 | 0;
      $4_1 = 0;
      $1_1 = 0;
     }
     HEAP32[(0 + 74652 | 0) >> 2] = $1_1;
     HEAP32[(0 + 74640 | 0) >> 2] = $4_1;
     break label$5;
    }
    $4_1 = 0;
    $6_1 = HEAP32[($5_1 + 4 | 0) >> 2] | 0;
    if ($6_1 & 2 | 0) {
     break label$1
    }
    $7_1 = ($6_1 & -8 | 0) + $3_1 | 0;
    if ($7_1 >>> 0 < $1_1 >>> 0) {
     break label$1
    }
    $8_1 = $7_1 - $1_1 | 0;
    label$11 : {
     label$12 : {
      if ($6_1 >>> 0 > 255 >>> 0) {
       break label$12
      }
      $3_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
      $9_1 = $6_1 >>> 3 | 0;
      $6_1 = ($9_1 << 3 | 0) + 74672 | 0;
      label$13 : {
       $4_1 = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
       if (($4_1 | 0) != ($3_1 | 0)) {
        break label$13
       }
       HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $9_1 | 0) | 0) | 0;
       break label$11;
      }
      HEAP32[($3_1 + 12 | 0) >> 2] = $4_1;
      HEAP32[($4_1 + 8 | 0) >> 2] = $3_1;
      break label$11;
     }
     $10_1 = HEAP32[($5_1 + 24 | 0) >> 2] | 0;
     label$14 : {
      label$15 : {
       $6_1 = HEAP32[($5_1 + 12 | 0) >> 2] | 0;
       if (($6_1 | 0) == ($5_1 | 0)) {
        break label$15
       }
       $3_1 = HEAP32[($5_1 + 8 | 0) >> 2] | 0;
       HEAP32[(0 + 74648 | 0) >> 2] | 0;
       HEAP32[($3_1 + 12 | 0) >> 2] = $6_1;
       HEAP32[($6_1 + 8 | 0) >> 2] = $3_1;
       break label$14;
      }
      label$16 : {
       label$17 : {
        $4_1 = $5_1 + 20 | 0;
        $3_1 = HEAP32[$4_1 >> 2] | 0;
        if ($3_1) {
         break label$17
        }
        $3_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
        if (!$3_1) {
         break label$16
        }
        $4_1 = $5_1 + 16 | 0;
       }
       label$18 : while (1) {
        $9_1 = $4_1;
        $6_1 = $3_1;
        $4_1 = $3_1 + 20 | 0;
        $3_1 = HEAP32[$4_1 >> 2] | 0;
        if ($3_1) {
         continue label$18
        }
        $4_1 = $6_1 + 16 | 0;
        $3_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
        if ($3_1) {
         continue label$18
        }
        break label$18;
       };
       HEAP32[$9_1 >> 2] = 0;
       break label$14;
      }
      $6_1 = 0;
     }
     if (!$10_1) {
      break label$11
     }
     label$19 : {
      label$20 : {
       $4_1 = HEAP32[($5_1 + 28 | 0) >> 2] | 0;
       $3_1 = ($4_1 << 2 | 0) + 74936 | 0;
       if (($5_1 | 0) != (HEAP32[$3_1 >> 2] | 0 | 0)) {
        break label$20
       }
       HEAP32[$3_1 >> 2] = $6_1;
       if ($6_1) {
        break label$19
       }
       HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
       break label$11;
      }
      HEAP32[($10_1 + ((HEAP32[($10_1 + 16 | 0) >> 2] | 0 | 0) == ($5_1 | 0) ? 16 : 20) | 0) >> 2] = $6_1;
      if (!$6_1) {
       break label$11
      }
     }
     HEAP32[($6_1 + 24 | 0) >> 2] = $10_1;
     label$21 : {
      $3_1 = HEAP32[($5_1 + 16 | 0) >> 2] | 0;
      if (!$3_1) {
       break label$21
      }
      HEAP32[($6_1 + 16 | 0) >> 2] = $3_1;
      HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
     }
     $3_1 = HEAP32[($5_1 + 20 | 0) >> 2] | 0;
     if (!$3_1) {
      break label$11
     }
     HEAP32[($6_1 + 20 | 0) >> 2] = $3_1;
     HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
    }
    label$22 : {
     if ($8_1 >>> 0 > 15 >>> 0) {
      break label$22
     }
     HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $7_1 | 0 | 2 | 0;
     $1_1 = $0_1 + $7_1 | 0;
     HEAP32[($1_1 + 4 | 0) >> 2] = HEAP32[($1_1 + 4 | 0) >> 2] | 0 | 1 | 0;
     break label$5;
    }
    HEAP32[($0_1 + 4 | 0) >> 2] = $2_1 & 1 | 0 | $1_1 | 0 | 2 | 0;
    $1_1 = $0_1 + $1_1 | 0;
    HEAP32[($1_1 + 4 | 0) >> 2] = $8_1 | 3 | 0;
    $3_1 = $0_1 + $7_1 | 0;
    HEAP32[($3_1 + 4 | 0) >> 2] = HEAP32[($3_1 + 4 | 0) >> 2] | 0 | 1 | 0;
    $32($1_1 | 0, $8_1 | 0);
   }
   $4_1 = $0_1;
  }
  return $4_1 | 0;
 }
 
 function $32($0_1, $1_1) {
  $0_1 = $0_1 | 0;
  $1_1 = $1_1 | 0;
  var $3_1 = 0, $6_1 = 0, $4_1 = 0, $2_1 = 0, $5_1 = 0, $7_1 = 0;
  $2_1 = $0_1 + $1_1 | 0;
  label$1 : {
   label$2 : {
    $3_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
    if ($3_1 & 1 | 0) {
     break label$2
    }
    if (!($3_1 & 3 | 0)) {
     break label$1
    }
    $3_1 = HEAP32[$0_1 >> 2] | 0;
    $1_1 = $3_1 + $1_1 | 0;
    label$3 : {
     label$4 : {
      label$5 : {
       label$6 : {
        $0_1 = $0_1 - $3_1 | 0;
        if (($0_1 | 0) == (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
         break label$6
        }
        label$7 : {
         if ($3_1 >>> 0 > 255 >>> 0) {
          break label$7
         }
         $4_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
         $5_1 = $3_1 >>> 3 | 0;
         $6_1 = ($5_1 << 3 | 0) + 74672 | 0;
         $3_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
         if (($3_1 | 0) != ($4_1 | 0)) {
          break label$5
         }
         HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
         break label$2;
        }
        $7_1 = HEAP32[($0_1 + 24 | 0) >> 2] | 0;
        label$8 : {
         $6_1 = HEAP32[($0_1 + 12 | 0) >> 2] | 0;
         if (($6_1 | 0) == ($0_1 | 0)) {
          break label$8
         }
         $3_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
         HEAP32[(0 + 74648 | 0) >> 2] | 0;
         HEAP32[($3_1 + 12 | 0) >> 2] = $6_1;
         HEAP32[($6_1 + 8 | 0) >> 2] = $3_1;
         break label$3;
        }
        label$9 : {
         $4_1 = $0_1 + 20 | 0;
         $3_1 = HEAP32[$4_1 >> 2] | 0;
         if ($3_1) {
          break label$9
         }
         $3_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
         if (!$3_1) {
          break label$4
         }
         $4_1 = $0_1 + 16 | 0;
        }
        label$10 : while (1) {
         $5_1 = $4_1;
         $6_1 = $3_1;
         $4_1 = $3_1 + 20 | 0;
         $3_1 = HEAP32[$4_1 >> 2] | 0;
         if ($3_1) {
          continue label$10
         }
         $4_1 = $6_1 + 16 | 0;
         $3_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
         if ($3_1) {
          continue label$10
         }
         break label$10;
        };
        HEAP32[$5_1 >> 2] = 0;
        break label$3;
       }
       $3_1 = HEAP32[($2_1 + 4 | 0) >> 2] | 0;
       if (($3_1 & 3 | 0 | 0) != (3 | 0)) {
        break label$2
       }
       HEAP32[(0 + 74640 | 0) >> 2] = $1_1;
       HEAP32[($2_1 + 4 | 0) >> 2] = $3_1 & -2 | 0;
       HEAP32[($0_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
       HEAP32[$2_1 >> 2] = $1_1;
       return;
      }
      HEAP32[($4_1 + 12 | 0) >> 2] = $3_1;
      HEAP32[($3_1 + 8 | 0) >> 2] = $4_1;
      break label$2;
     }
     $6_1 = 0;
    }
    if (!$7_1) {
     break label$2
    }
    label$11 : {
     label$12 : {
      $4_1 = HEAP32[($0_1 + 28 | 0) >> 2] | 0;
      $3_1 = ($4_1 << 2 | 0) + 74936 | 0;
      if (($0_1 | 0) != (HEAP32[$3_1 >> 2] | 0 | 0)) {
       break label$12
      }
      HEAP32[$3_1 >> 2] = $6_1;
      if ($6_1) {
       break label$11
      }
      HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
      break label$2;
     }
     HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($0_1 | 0) ? 16 : 20) | 0) >> 2] = $6_1;
     if (!$6_1) {
      break label$2
     }
    }
    HEAP32[($6_1 + 24 | 0) >> 2] = $7_1;
    label$13 : {
     $3_1 = HEAP32[($0_1 + 16 | 0) >> 2] | 0;
     if (!$3_1) {
      break label$13
     }
     HEAP32[($6_1 + 16 | 0) >> 2] = $3_1;
     HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
    }
    $3_1 = HEAP32[($0_1 + 20 | 0) >> 2] | 0;
    if (!$3_1) {
     break label$2
    }
    HEAP32[($6_1 + 20 | 0) >> 2] = $3_1;
    HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
   }
   label$14 : {
    label$15 : {
     label$16 : {
      label$17 : {
       label$18 : {
        $3_1 = HEAP32[($2_1 + 4 | 0) >> 2] | 0;
        if ($3_1 & 2 | 0) {
         break label$18
        }
        label$19 : {
         if (($2_1 | 0) != (HEAP32[(0 + 74656 | 0) >> 2] | 0 | 0)) {
          break label$19
         }
         HEAP32[(0 + 74656 | 0) >> 2] = $0_1;
         $1_1 = (HEAP32[(0 + 74644 | 0) >> 2] | 0) + $1_1 | 0;
         HEAP32[(0 + 74644 | 0) >> 2] = $1_1;
         HEAP32[($0_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
         if (($0_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
          break label$1
         }
         HEAP32[(0 + 74640 | 0) >> 2] = 0;
         HEAP32[(0 + 74652 | 0) >> 2] = 0;
         return;
        }
        label$20 : {
         if (($2_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
          break label$20
         }
         HEAP32[(0 + 74652 | 0) >> 2] = $0_1;
         $1_1 = (HEAP32[(0 + 74640 | 0) >> 2] | 0) + $1_1 | 0;
         HEAP32[(0 + 74640 | 0) >> 2] = $1_1;
         HEAP32[($0_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
         HEAP32[($0_1 + $1_1 | 0) >> 2] = $1_1;
         return;
        }
        $1_1 = ($3_1 & -8 | 0) + $1_1 | 0;
        label$21 : {
         if ($3_1 >>> 0 > 255 >>> 0) {
          break label$21
         }
         $4_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
         $5_1 = $3_1 >>> 3 | 0;
         $6_1 = ($5_1 << 3 | 0) + 74672 | 0;
         label$22 : {
          $3_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
          if (($3_1 | 0) != ($4_1 | 0)) {
           break label$22
          }
          HEAP32[(0 + 74632 | 0) >> 2] = (HEAP32[(0 + 74632 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $5_1 | 0) | 0) | 0;
          break label$15;
         }
         HEAP32[($4_1 + 12 | 0) >> 2] = $3_1;
         HEAP32[($3_1 + 8 | 0) >> 2] = $4_1;
         break label$15;
        }
        $7_1 = HEAP32[($2_1 + 24 | 0) >> 2] | 0;
        label$23 : {
         $6_1 = HEAP32[($2_1 + 12 | 0) >> 2] | 0;
         if (($6_1 | 0) == ($2_1 | 0)) {
          break label$23
         }
         $3_1 = HEAP32[($2_1 + 8 | 0) >> 2] | 0;
         HEAP32[(0 + 74648 | 0) >> 2] | 0;
         HEAP32[($3_1 + 12 | 0) >> 2] = $6_1;
         HEAP32[($6_1 + 8 | 0) >> 2] = $3_1;
         break label$16;
        }
        label$24 : {
         $4_1 = $2_1 + 20 | 0;
         $3_1 = HEAP32[$4_1 >> 2] | 0;
         if ($3_1) {
          break label$24
         }
         $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
         if (!$3_1) {
          break label$17
         }
         $4_1 = $2_1 + 16 | 0;
        }
        label$25 : while (1) {
         $5_1 = $4_1;
         $6_1 = $3_1;
         $4_1 = $3_1 + 20 | 0;
         $3_1 = HEAP32[$4_1 >> 2] | 0;
         if ($3_1) {
          continue label$25
         }
         $4_1 = $6_1 + 16 | 0;
         $3_1 = HEAP32[($6_1 + 16 | 0) >> 2] | 0;
         if ($3_1) {
          continue label$25
         }
         break label$25;
        };
        HEAP32[$5_1 >> 2] = 0;
        break label$16;
       }
       HEAP32[($2_1 + 4 | 0) >> 2] = $3_1 & -2 | 0;
       HEAP32[($0_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
       HEAP32[($0_1 + $1_1 | 0) >> 2] = $1_1;
       break label$14;
      }
      $6_1 = 0;
     }
     if (!$7_1) {
      break label$15
     }
     label$26 : {
      label$27 : {
       $4_1 = HEAP32[($2_1 + 28 | 0) >> 2] | 0;
       $3_1 = ($4_1 << 2 | 0) + 74936 | 0;
       if (($2_1 | 0) != (HEAP32[$3_1 >> 2] | 0 | 0)) {
        break label$27
       }
       HEAP32[$3_1 >> 2] = $6_1;
       if ($6_1) {
        break label$26
       }
       HEAP32[(0 + 74636 | 0) >> 2] = (HEAP32[(0 + 74636 | 0) >> 2] | 0) & (__wasm_rotl_i32(-2 | 0, $4_1 | 0) | 0) | 0;
       break label$15;
      }
      HEAP32[($7_1 + ((HEAP32[($7_1 + 16 | 0) >> 2] | 0 | 0) == ($2_1 | 0) ? 16 : 20) | 0) >> 2] = $6_1;
      if (!$6_1) {
       break label$15
      }
     }
     HEAP32[($6_1 + 24 | 0) >> 2] = $7_1;
     label$28 : {
      $3_1 = HEAP32[($2_1 + 16 | 0) >> 2] | 0;
      if (!$3_1) {
       break label$28
      }
      HEAP32[($6_1 + 16 | 0) >> 2] = $3_1;
      HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
     }
     $3_1 = HEAP32[($2_1 + 20 | 0) >> 2] | 0;
     if (!$3_1) {
      break label$15
     }
     HEAP32[($6_1 + 20 | 0) >> 2] = $3_1;
     HEAP32[($3_1 + 24 | 0) >> 2] = $6_1;
    }
    HEAP32[($0_1 + 4 | 0) >> 2] = $1_1 | 1 | 0;
    HEAP32[($0_1 + $1_1 | 0) >> 2] = $1_1;
    if (($0_1 | 0) != (HEAP32[(0 + 74652 | 0) >> 2] | 0 | 0)) {
     break label$14
    }
    HEAP32[(0 + 74640 | 0) >> 2] = $1_1;
    return;
   }
   label$29 : {
    if ($1_1 >>> 0 > 255 >>> 0) {
     break label$29
    }
    $3_1 = ($1_1 & -8 | 0) + 74672 | 0;
    label$30 : {
     label$31 : {
      $4_1 = HEAP32[(0 + 74632 | 0) >> 2] | 0;
      $1_1 = 1 << ($1_1 >>> 3 | 0) | 0;
      if ($4_1 & $1_1 | 0) {
       break label$31
      }
      HEAP32[(0 + 74632 | 0) >> 2] = $4_1 | $1_1 | 0;
      $1_1 = $3_1;
      break label$30;
     }
     $1_1 = HEAP32[($3_1 + 8 | 0) >> 2] | 0;
    }
    HEAP32[($3_1 + 8 | 0) >> 2] = $0_1;
    HEAP32[($1_1 + 12 | 0) >> 2] = $0_1;
    HEAP32[($0_1 + 12 | 0) >> 2] = $3_1;
    HEAP32[($0_1 + 8 | 0) >> 2] = $1_1;
    return;
   }
   $3_1 = 31;
   label$32 : {
    if ($1_1 >>> 0 > 16777215 >>> 0) {
     break label$32
    }
    $3_1 = Math_clz32($1_1 >>> 8 | 0);
    $3_1 = ((($1_1 >>> (38 - $3_1 | 0) | 0) & 1 | 0) - ($3_1 << 1 | 0) | 0) + 62 | 0;
   }
   HEAP32[($0_1 + 28 | 0) >> 2] = $3_1;
   HEAP32[($0_1 + 16 | 0) >> 2] = 0;
   HEAP32[($0_1 + 20 | 0) >> 2] = 0;
   $4_1 = ($3_1 << 2 | 0) + 74936 | 0;
   label$33 : {
    label$34 : {
     label$35 : {
      $6_1 = HEAP32[(0 + 74636 | 0) >> 2] | 0;
      $2_1 = 1 << $3_1 | 0;
      if ($6_1 & $2_1 | 0) {
       break label$35
      }
      HEAP32[(0 + 74636 | 0) >> 2] = $6_1 | $2_1 | 0;
      HEAP32[$4_1 >> 2] = $0_1;
      HEAP32[($0_1 + 24 | 0) >> 2] = $4_1;
      break label$34;
     }
     $3_1 = $1_1 << (($3_1 | 0) == (31 | 0) ? 0 : 25 - ($3_1 >>> 1 | 0) | 0) | 0;
     $6_1 = HEAP32[$4_1 >> 2] | 0;
     label$36 : while (1) {
      $4_1 = $6_1;
      if (((HEAP32[($6_1 + 4 | 0) >> 2] | 0) & -8 | 0 | 0) == ($1_1 | 0)) {
       break label$33
      }
      $6_1 = $3_1 >>> 29 | 0;
      $3_1 = $3_1 << 1 | 0;
      $2_1 = ($4_1 + ($6_1 & 4 | 0) | 0) + 16 | 0;
      $6_1 = HEAP32[$2_1 >> 2] | 0;
      if ($6_1) {
       continue label$36
      }
      break label$36;
     };
     HEAP32[$2_1 >> 2] = $0_1;
     HEAP32[($0_1 + 24 | 0) >> 2] = $4_1;
    }
    HEAP32[($0_1 + 12 | 0) >> 2] = $0_1;
    HEAP32[($0_1 + 8 | 0) >> 2] = $0_1;
    return;
   }
   $1_1 = HEAP32[($4_1 + 8 | 0) >> 2] | 0;
   HEAP32[($1_1 + 12 | 0) >> 2] = $0_1;
   HEAP32[($4_1 + 8 | 0) >> 2] = $0_1;
   HEAP32[($0_1 + 24 | 0) >> 2] = 0;
   HEAP32[($0_1 + 12 | 0) >> 2] = $4_1;
   HEAP32[($0_1 + 8 | 0) >> 2] = $1_1;
  }
 }
 
 function $33() {
  global$2 = 65536;
  global$1 = (0 + 15 | 0) & -16 | 0;
 }
 
 function $34() {
  return global$0 - global$1 | 0 | 0;
 }
 
 function $35() {
  return global$2 | 0;
 }
 
 function $36() {
  return global$1 | 0;
 }
 
 function $37() {
  return global$0 | 0;
 }
 
 function $38($0_1) {
  $0_1 = $0_1 | 0;
  global$0 = $0_1;
 }
 
 function $39($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0;
  $1_1 = (global$0 - $0_1 | 0) & -16 | 0;
  global$0 = $1_1;
  return $1_1 | 0;
 }
 
 function $40() {
  return global$0 | 0;
 }
 
 function $41($0_1) {
  $0_1 = $0_1 | 0;
  global$3 = $0_1;
 }
 
 function $42() {
  return global$3 | 0;
 }
 
 function $43($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $44($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $45() {
  $43(75128 | 0);
  return 75132 | 0;
 }
 
 function $46() {
  $44(75128 | 0);
 }
 
 function $47($0_1) {
  $0_1 = $0_1 | 0;
  return 1 | 0;
 }
 
 function $48($0_1) {
  $0_1 = $0_1 | 0;
 }
 
 function $49($0_1) {
  $0_1 = $0_1 | 0;
  var $1_1 = 0, i64toi32_i32$1 = 0, $2_1 = 0, i64toi32_i32$0 = 0, $3_1 = 0;
  label$1 : {
   if ($0_1) {
    break label$1
   }
   $1_1 = 0;
   label$2 : {
    if (!(HEAP32[(0 + 75136 | 0) >> 2] | 0)) {
     break label$2
    }
    $1_1 = $49(HEAP32[(0 + 75136 | 0) >> 2] | 0 | 0) | 0;
   }
   label$3 : {
    if (!(HEAP32[(0 + 75136 | 0) >> 2] | 0)) {
     break label$3
    }
    $1_1 = $49(HEAP32[(0 + 75136 | 0) >> 2] | 0 | 0) | 0 | $1_1 | 0;
   }
   label$4 : {
    $0_1 = HEAP32[($45() | 0) >> 2] | 0;
    if (!$0_1) {
     break label$4
    }
    label$5 : while (1) {
     $2_1 = 0;
     label$6 : {
      if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
       break label$6
      }
      $2_1 = $47($0_1 | 0) | 0;
     }
     label$7 : {
      if ((HEAP32[($0_1 + 20 | 0) >> 2] | 0 | 0) == (HEAP32[($0_1 + 28 | 0) >> 2] | 0 | 0)) {
       break label$7
      }
      $1_1 = $49($0_1 | 0) | 0 | $1_1 | 0;
     }
     label$8 : {
      if (!$2_1) {
       break label$8
      }
      $48($0_1 | 0);
     }
     $0_1 = HEAP32[($0_1 + 56 | 0) >> 2] | 0;
     if ($0_1) {
      continue label$5
     }
     break label$5;
    };
   }
   $46();
   return $1_1 | 0;
  }
  $2_1 = 0;
  label$9 : {
   if ((HEAP32[($0_1 + 76 | 0) >> 2] | 0 | 0) < (0 | 0)) {
    break label$9
   }
   $2_1 = $47($0_1 | 0) | 0;
  }
  label$10 : {
   label$11 : {
    label$12 : {
     if ((HEAP32[($0_1 + 20 | 0) >> 2] | 0 | 0) == (HEAP32[($0_1 + 28 | 0) >> 2] | 0 | 0)) {
      break label$12
     }
     FUNCTION_TABLE[HEAP32[($0_1 + 36 | 0) >> 2] | 0 | 0]($0_1, 0, 0) | 0;
     if (HEAP32[($0_1 + 20 | 0) >> 2] | 0) {
      break label$12
     }
     $1_1 = -1;
     if ($2_1) {
      break label$11
     }
     break label$10;
    }
    label$13 : {
     $1_1 = HEAP32[($0_1 + 4 | 0) >> 2] | 0;
     $3_1 = HEAP32[($0_1 + 8 | 0) >> 2] | 0;
     if (($1_1 | 0) == ($3_1 | 0)) {
      break label$13
     }
     i64toi32_i32$1 = $1_1 - $3_1 | 0;
     i64toi32_i32$0 = i64toi32_i32$1 >> 31 | 0;
     i64toi32_i32$0 = FUNCTION_TABLE[HEAP32[($0_1 + 40 | 0) >> 2] | 0 | 0]($0_1, i64toi32_i32$1, i64toi32_i32$0, 1) | 0;
     i64toi32_i32$1 = i64toi32_i32$HIGH_BITS;
    }
    $1_1 = 0;
    HEAP32[($0_1 + 28 | 0) >> 2] = 0;
    i64toi32_i32$0 = $0_1;
    i64toi32_i32$1 = 0;
    HEAP32[($0_1 + 16 | 0) >> 2] = 0;
    HEAP32[($0_1 + 20 | 0) >> 2] = i64toi32_i32$1;
    i64toi32_i32$0 = $0_1;
    i64toi32_i32$1 = 0;
    HEAP32[($0_1 + 4 | 0) >> 2] = 0;
    HEAP32[($0_1 + 8 | 0) >> 2] = i64toi32_i32$1;
    if (!$2_1) {
     break label$10
    }
   }
   $48($0_1 | 0);
  }
  return $1_1 | 0;
 }
 
 function __wasm_ctz_i32(var$0) {
  var$0 = var$0 | 0;
  if (var$0) {
   return 31 - Math_clz32((var$0 + -1 | 0) ^ var$0 | 0) | 0 | 0
  }
  return 32 | 0;
 }
 
 function __wasm_rotl_i32(var$0, var$1) {
  var$0 = var$0 | 0;
  var$1 = var$1 | 0;
  var var$2 = 0;
  var$2 = var$1 & 31 | 0;
  var$1 = (0 - var$1 | 0) & 31 | 0;
  return ((-1 >>> var$2 | 0) & var$0 | 0) << var$2 | 0 | (((-1 << var$1 | 0) & var$0 | 0) >>> var$1 | 0) | 0 | 0;
 }
 
 // EMSCRIPTEN_END_FUNCS
;
 bufferView = HEAPU8;
 initActiveSegments(imports);
 var FUNCTION_TABLE = Table([null, $22, $23]);
 function __wasm_memory_size() {
  return buffer.byteLength / 65536 | 0;
 }
 
 return {
  "__wasm_call_ctors": $0, 
  "qrcd": $3, 
  "__indirect_function_table": FUNCTION_TABLE, 
  "__errno_location": $26, 
  "fflush": $49, 
  "setTempRet0": $41, 
  "getTempRet0": $42, 
  "emscripten_stack_init": $33, 
  "emscripten_stack_get_free": $34, 
  "emscripten_stack_get_base": $35, 
  "emscripten_stack_get_end": $36, 
  "stackSave": $37, 
  "stackRestore": $38, 
  "stackAlloc": $39, 
  "emscripten_stack_get_current": $40
 };
}

  return asmFunc(info);
}

)(info);
  },

  instantiate: /** @suppress{checkTypes} */ function(binary, info) {
    return {
      then: function(ok) {
        var module = new WebAssembly.Module(binary);
        ok({
          'instance': new WebAssembly.Instance(module, info)
        });
        // Emulate a simple WebAssembly.instantiate(..).then(()=>{}).catch(()=>{}) syntax.
        return { catch: function() {} };
      }
    };
  },

  RuntimeError: Error
};

// We don't need to actually download a wasm binary, mark it as present but empty.
wasmBinary = [];

// end include: wasm2js.js
if (typeof WebAssembly != 'object') {
  abort('no native wasm support detected');
}

// Wasm globals

var wasmMemory;

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
function _malloc() {
  abort("malloc() called but not included in the build - add '_malloc' to EXPORTED_FUNCTIONS");
}
function _free() {
  // Show a helpful error since we used to include free by default in the past.
  abort("free() called but not included in the build - add '_free' to EXPORTED_FUNCTIONS");
}

// Memory management

var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  Module['HEAP16'] = HEAP16 = new Int16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
}

assert(!Module['STACK_SIZE'], 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

assert(typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
       'JS engine does not provide full typed array support');

// In non-standalone/normal mode, we create the memory here.
// include: runtime_init_memory.js
// Create the wasm memory. (Note: this only applies if IMPORTED_MEMORY is defined)

var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;legacyModuleProp('INITIAL_MEMORY', 'INITIAL_MEMORY');

assert(INITIAL_MEMORY >= 65536, 'INITIAL_MEMORY should be larger than STACK_SIZE, was ' + INITIAL_MEMORY + '! (STACK_SIZE=' + 65536 + ')');

// check for full engine support (use string 'subarray' to avoid closure compiler confusion)

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_MEMORY / 65536,
      'maximum': INITIAL_MEMORY / 65536
    });
  }

updateMemoryViews();

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['INITIAL_MEMORY'].
INITIAL_MEMORY = wasmMemory.buffer.byteLength;
assert(INITIAL_MEMORY % 65536 === 0);

// end include: runtime_init_memory.js

// include: runtime_init_table.js
// In regular non-RELOCATABLE mode the table is exported
// from the wasm module and this will be assigned once
// the exports are available.
var wasmTable;

// end include: runtime_init_table.js
// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with the (separate) address-zero check
  // below.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;
  // Also test the global address 0 for integrity.
  HEAPU32[0] = 0x63736d65; /* 'emsc' */
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort('Stack overflow! Stack cookie has been overwritten at ' + ptrToString(max) + ', expected hex dwords 0x89BACDFE and 0x2135467, but received ' + ptrToString(cookie2) + ' ' + ptrToString(cookie1));
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[0] !== 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}

// end include: runtime_stack_check.js
// include: runtime_assertions.js
// Endianness check
(function() {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
})();

// end include: runtime_assertions.js
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;

var runtimeKeepaliveCounter = 0;

function keepRuntimeAlive() {
  return noExitRuntime || runtimeKeepaliveCounter > 0;
}

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
  checkStackCookie();

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill');

// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            err('still waiting on run dependencies:');
          }
          err('dependency: ' + dep);
        }
        if (shown) {
          err('(end of list)');
        }
      }, 10000);
    }
  } else {
    err('warning: run dependency added without ID');
  }
}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    err('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // defintion for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// show errors on likely calls to FS when it was not included
var FS = {
  error: function() {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM');
  },
  init: function() { FS.error() },
  createDataFile: function() { FS.error() },
  createPreloadedFile: function() { FS.error() },
  createLazyFile: function() { FS.error() },
  open: function() { FS.error() },
  mkdev: function() { FS.error() },
  registerDevice: function() { FS.error() },
  analyzePath: function() { FS.error() },

  ErrnoError: function ErrnoError() { FS.error() },
};
Module['FS_createDataFile'] = FS.createDataFile;
Module['FS_createPreloadedFile'] = FS.createPreloadedFile;

// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  // Prefix of data URIs emitted by SINGLE_FILE and related options.
  return filename.startsWith(dataURIPrefix);
}

// Indicates whether filename is delivered via file protocol (as opposed to http/https)
function isFileURI(filename) {
  return filename.startsWith('file://');
}

// end include: URIUtils.js
/** @param {boolean=} fixedasm */
function createExportWrapper(name, fixedasm) {
  return function() {
    var displayName = name;
    var asm = fixedasm;
    if (!fixedasm) {
      asm = Module['asm'];
    }
    assert(runtimeInitialized, 'native function `' + displayName + '` called before runtime initialization');
    if (!asm[name]) {
      assert(asm[name], 'exported native function `' + displayName + '` not found');
    }
    return asm[name].apply(null, arguments);
  };
}

// include: runtime_exceptions.js
// end include: runtime_exceptions.js
var wasmBinaryFile;
  wasmBinaryFile = 'lrcdec.wasm';
  if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile);
  }

function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    var binary = tryParseAsDataURI(file);
    if (binary) {
      return binary;
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "sync fetching of the wasm failed: you can preload it to Module['wasmBinary'] manually, or emcc.py will do that for you when generating HTML (but not JS)";
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise(binaryFile) {
  // If we don't have the binary yet, try to load it asynchronously.
  // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
  // See https://github.com/github/fetch/pull/92#issuecomment-140665932
  // Cordova or Electron apps are typically loaded from a file:// url.
  // So use fetch if it is available and the url is not a file, otherwise fall back to XHR.
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch == 'function'
      && !isFileURI(binaryFile)
    ) {
      return fetch(binaryFile, { credentials: 'same-origin' }).then((response) => {
        if (!response['ok']) {
          throw "failed to load wasm binary file at '" + binaryFile + "'";
        }
        return response['arrayBuffer']();
      }).catch(() => getBinary(binaryFile));
    }
    else {
      if (readAsync) {
        // fetch is not available or url is file => try XHR (readAsync uses XHR internally)
        return new Promise((resolve, reject) => {
          readAsync(binaryFile, (response) => resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))), reject)
        });
      }
    }
  }

  // Otherwise, getBinary should be able to get it synchronously
  return Promise.resolve().then(() => getBinary(binaryFile));
}

function instantiateSync(file, info) {
  var instance;
  var module;
  var binary;
  try {
    binary = getBinary(file);
    module = new WebAssembly.Module(binary);
    instance = new WebAssembly.Instance(module, info);
  } catch (e) {
    var str = e.toString();
    err('failed to compile wasm module: ' + str);
    if (str.includes('imported Memory') ||
        str.includes('memory import')) {
      err('Memory size incompatibility issues may be due to changing INITIAL_MEMORY at runtime to something too large. Use ALLOW_MEMORY_GROWTH to allow any size memory (and also make sure not to set INITIAL_MEMORY at runtime to something smaller than it was at compile time).');
    }
    throw e;
  }
  return [instance, module];
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    var exports = instance.exports;

    Module['asm'] = exports;

    wasmTable = Module['asm']['__indirect_function_table'];
    assert(wasmTable, "table not found in wasm exports");

    addOnInit(Module['asm']['__wasm_call_ctors']);

    removeRunDependency('wasm-instantiate');

    return exports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {

    try {
      return Module['instantiateWasm'](info, receiveInstance);
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
        return false;
    }
  }

  var result = instantiateSync(wasmBinaryFile, info);
  // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193,
  // the above line no longer optimizes out down to the following line.
  // When the regression is fixed, we can remove this if/else.
  return receiveInstance(result[0]);
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;
var tempI64;

// include: runtime_debug.js
function legacyModuleProp(prop, newName) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get: function() {
        abort('Module.' + prop + ' has been replaced with plain ' + newName + ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)');
      }
    });
  }
}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort('`Module.' + prop + '` was supplied but `' + prop + '` not included in INCOMING_MODULE_JS_API');
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

function missingGlobal(sym, msg) {
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get: function() {
        warnOnce('`' + sym + '` is not longer defined by emscripten. ' + msg);
        return undefined;
      }
    });
  }
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');

function missingLibrarySymbol(sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get: function() {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        var msg = '`' + sym + '` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line';
        // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
        // library.js, which means $name for a JS name with no prefix, or name
        // for a JS name like _name.
        var librarySymbol = sym;
        if (!librarySymbol.startsWith('_')) {
          librarySymbol = '$' + sym;
        }
        msg += " (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=" + librarySymbol + ")";
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        warnOnce(msg);
        return undefined;
      }
    });
  }
  // Any symbol that is not included from the JS libary is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get: function() {
        var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      }
    });
  }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(text) {
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as errors.
  console.error.apply(console, arguments);
}

// end include: runtime_debug.js
// === Body ===


// end include: preamble.js

  /** @constructor */
  function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = 'Program terminated with exit(' + status + ')';
      this.status = status;
    }

  function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    }

  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort('invalid type for getValue: ' + type);
    }
  }

  function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      var chr = array[i];
      if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
        chr &= 0xFF;
      }
      ret.push(String.fromCharCode(chr));
    }
    return ret.join('');
  }

  function ptrToString(ptr) {
      assert(typeof ptr === 'number');
      return '0x' + ptr.toString(16).padStart(8, '0');
    }

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[((ptr)>>0)] = value; break;
      case 'i8': HEAP8[((ptr)>>0)] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math.abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? (+(Math.floor((tempDouble)/4294967296.0)))>>>0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)], HEAP32[((ptr)>>2)] = tempI64[0],HEAP32[(((ptr)+(4))>>2)] = tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort('invalid type for setValue: ' + type);
    }
  }

  function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    }

  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }

  function getHeapMax() {
      return HEAPU8.length;
    }
  
  function abortOnCannotGrowMemory(requestedSize) {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    }
  function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      abortOnCannotGrowMemory(requestedSize);
    }

  function getCFunc(ident) {
      var func = Module['_' + ident]; // closure exported function
      assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
      return func;
    }
  
  function writeArrayToMemory(array, buffer) {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    }
  
  function lengthBytesUTF8(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }
  
  function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      assert(typeof str === 'string');
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
          var u1 = str.charCodeAt(++i);
          u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
  function stringToUTF8(str, outPtr, maxBytesToWrite) {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
      return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
    }
  function stringToUTF8OnStack(str) {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    }
  
  var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;
  
    /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
  function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.  Also, use the length info to avoid running tiny
      // strings through TextDecoder, since .subarray() allocates garbage.
      // (As a tiny code save trick, compare endPtr against endIdx using a negation,
      // so that undefined means Infinity)
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      // If building with TextDecoder, we have already computed the string length
      // above, so test loop end condition against that
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    }
  
  
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
  function UTF8ToString(ptr, maxBytesToRead) {
      assert(typeof ptr == 'number');
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    }
  
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */
  function ccall(ident, returnType, argTypes, args, opts) {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    }
// include: base64Utils.js
// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {string} input The string to decode.
 */
var decodeBase64 = typeof atob == 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE == 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf = Buffer.from(s, 'base64');
    return new Uint8Array(buf['buffer'], buf['byteOffset'], buf['byteLength']);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


// end include: base64Utils.js
function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
}
var wasmImports = {
  "emscripten_memcpy_big": _emscripten_memcpy_big,
  "emscripten_resize_heap": _emscripten_resize_heap,
  "memory": wasmMemory
};
var asm = createWasm();
/** @type {function(...*):?} */
var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors", asm);
/** @type {function(...*):?} */
var _qrcd = Module["_qrcd"] = createExportWrapper("qrcd", asm);
/** @type {function(...*):?} */
var ___errno_location = createExportWrapper("__errno_location", asm);
/** @type {function(...*):?} */
var _fflush = Module["_fflush"] = createExportWrapper("fflush", asm);
/** @type {function(...*):?} */
var setTempRet0 = createExportWrapper("setTempRet0", asm);
/** @type {function(...*):?} */
var getTempRet0 = createExportWrapper("getTempRet0", asm);
/** @type {function(...*):?} */
var _emscripten_stack_init = asm["emscripten_stack_init"]
/** @type {function(...*):?} */
var _emscripten_stack_get_free = asm["emscripten_stack_get_free"]
/** @type {function(...*):?} */
var _emscripten_stack_get_base = asm["emscripten_stack_get_base"]
/** @type {function(...*):?} */
var _emscripten_stack_get_end = asm["emscripten_stack_get_end"]
/** @type {function(...*):?} */
var stackSave = createExportWrapper("stackSave", asm);
/** @type {function(...*):?} */
var stackRestore = createExportWrapper("stackRestore", asm);
/** @type {function(...*):?} */
var stackAlloc = createExportWrapper("stackAlloc", asm);
/** @type {function(...*):?} */
var _emscripten_stack_get_current = asm["emscripten_stack_get_current"]


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

Module["ccall"] = ccall;
var missingLibrarySymbols = [
  'zeroMemory',
  'exitJS',
  'emscripten_realloc_buffer',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'setErrNo',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'getHostByName',
  'initRandomFill',
  'randomFill',
  'traverseStack',
  'getCallstack',
  'emscriptenLog',
  'convertPCtoSourceLocation',
  'readEmAsmArgs',
  'jstoi_q',
  'jstoi_s',
  'getExecutableName',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'handleException',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'safeSetTimeout',
  'asmjsMangle',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'HandleAllocator',
  'getNativeTypeSize',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'cwrap',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayFromString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'getSocketFromFD',
  'getSocketAddress',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'demangle',
  'demangleAll',
  'jsStackTrace',
  'stackTrace',
  'getEnvStrings',
  'checkWasiClock',
  'flush_NO_FILESYSTEM',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'createDyncallWrapper',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'getPromise',
  'makePromise',
  'idsToPromises',
  'makePromiseCallback',
  'ExceptionInfo',
  'setMainLoop',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'heapAccessShiftForWebGLHeap',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  '__glGenObject',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'SDL_unicode',
  'SDL_ttfContext',
  'SDL_audio',
  'GLFW_Window',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

var unexportedSymbols = [
  'run',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'FS_createFolder',
  'FS_createPath',
  'FS_createDataFile',
  'FS_createLazyFile',
  'FS_createLink',
  'FS_createDevice',
  'FS_unlink',
  'out',
  'err',
  'callMain',
  'abort',
  'keepRuntimeAlive',
  'wasmMemory',
  'stackAlloc',
  'stackSave',
  'stackRestore',
  'getTempRet0',
  'setTempRet0',
  'writeStackCookie',
  'checkStackCookie',
  'intArrayFromBase64',
  'tryParseAsDataURI',
  'ptrToString',
  'getHeapMax',
  'abortOnCannotGrowMemory',
  'ENV',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'ERRNO_CODES',
  'ERRNO_MESSAGES',
  'DNS',
  'Protocols',
  'Sockets',
  'timers',
  'warnOnce',
  'UNWIND_CACHE',
  'readEmAsmArgsArray',
  'getCFunc',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayToString',
  'UTF16Decoder',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'SYSCALLS',
  'JSEvents',
  'specialHTMLTargets',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'ExitStatus',
  'dlopenMissingError',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'Browser',
  'wget',
  'preloadPlugins',
  'FS',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'emscripten_webgl_power_preferences',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'GLFW',
  'allocateUTF8',
  'allocateUTF8OnStack',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);



var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run() {

  if (runDependencies > 0) {
    return;
  }

    stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    assert(!Module['_main'], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.');
    warnOnce('(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)');
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

run();


// end include: postamble.js
