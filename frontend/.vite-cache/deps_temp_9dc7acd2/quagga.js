import {
  __commonJS
} from "./chunk-OL46QLBJ.js";

// node_modules/quagga/dist/quagga.min.js
var require_quagga_min = __commonJS({
  "node_modules/quagga/dist/quagga.min.js"(exports, module) {
    !function(t, e) {
      "object" == typeof exports && "object" == typeof module ? module.exports = e(e.toString()).default : "object" == typeof exports ? exports.Quagga = e(e.toString()).default : t.Quagga = e(e.toString()).default;
    }(exports, function(t) {
      return function(t2) {
        function e(r) {
          if (n[r]) return n[r].exports;
          var o = n[r] = { i: r, l: false, exports: {} };
          return t2[r].call(o.exports, o, o.exports, e), o.l = true, o.exports;
        }
        var n = {};
        return e.m = t2, e.c = n, e.i = function(t3) {
          return t3;
        }, e.d = function(t3, n2, r) {
          e.o(t3, n2) || Object.defineProperty(t3, n2, { configurable: false, enumerable: true, get: r });
        }, e.n = function(t3) {
          var n2 = t3 && t3.__esModule ? function() {
            return t3.default;
          } : function() {
            return t3;
          };
          return e.d(n2, "a", n2), n2;
        }, e.o = function(t3, e2) {
          return Object.prototype.hasOwnProperty.call(t3, e2);
        }, e.p = "/", e(e.s = 166);
      }([function(t2, e) {
        function n(t3) {
          var e2 = typeof t3;
          return null != t3 && ("object" == e2 || "function" == e2);
        }
        t2.exports = n;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          return this._row = [], this.config = t3 || {}, this.supplements = e2, this;
        }
        var o = n(3);
        r.prototype._nextUnset = function(t3, e2) {
          var n2;
          for (void 0 === e2 && (e2 = 0), n2 = e2; n2 < t3.length; n2++) if (!t3[n2]) return n2;
          return t3.length;
        }, r.prototype._matchPattern = function(t3, e2, n2) {
          var r2, o2, i, a, u = 0, c = 0, s = 0, f = 0;
          for (n2 = n2 || this.SINGLE_CODE_ERROR || 1, r2 = 0; r2 < t3.length; r2++) s += t3[r2], f += e2[r2];
          if (s < f) return Number.MAX_VALUE;
          for (o2 = s / f, n2 *= o2, r2 = 0; r2 < t3.length; r2++) {
            if (i = t3[r2], a = e2[r2] * o2, (c = Math.abs(i - a) / a) > n2) return Number.MAX_VALUE;
            u += c;
          }
          return u / f;
        }, r.prototype._nextSet = function(t3, e2) {
          var n2;
          for (e2 = e2 || 0, n2 = e2; n2 < t3.length; n2++) if (t3[n2]) return n2;
          return t3.length;
        }, r.prototype._correctBars = function(t3, e2, n2) {
          for (var r2 = n2.length, o2 = 0; r2--; ) (o2 = t3[n2[r2]] * (1 - (1 - e2) / 2)) > 1 && (t3[n2[r2]] = o2);
        }, r.prototype._matchTrace = function(t3, e2) {
          var n2, r2, o2 = [], i = this, a = i._nextSet(i._row), u = !i._row[a], c = 0, s = { error: Number.MAX_VALUE, code: -1, start: 0 };
          if (t3) {
            for (n2 = 0; n2 < t3.length; n2++) o2.push(0);
            for (n2 = a; n2 < i._row.length; n2++) if (i._row[n2] ^ u) o2[c]++;
            else {
              if (c === o2.length - 1) return r2 = i._matchPattern(o2, t3), r2 < e2 ? (s.start = n2 - a, s.end = n2, s.counter = o2, s) : null;
              c++, o2[c] = 1, u = !u;
            }
          } else for (o2.push(0), n2 = a; n2 < i._row.length; n2++) i._row[n2] ^ u ? o2[c]++ : (c++, o2.push(0), o2[c] = 1, u = !u);
          return s.start = a, s.end = i._row.length - 1, s.counter = o2, s;
        }, r.prototype.decodePattern = function(t3) {
          var e2, n2 = this;
          return n2._row = t3, e2 = n2._decode(), null === e2 ? (n2._row.reverse(), (e2 = n2._decode()) && (e2.direction = r.DIRECTION.REVERSE, e2.start = n2._row.length - e2.start, e2.end = n2._row.length - e2.end)) : e2.direction = r.DIRECTION.FORWARD, e2 && (e2.format = n2.FORMAT), e2;
        }, r.prototype._matchRange = function(t3, e2, n2) {
          var r2;
          for (t3 = t3 < 0 ? 0 : t3, r2 = t3; r2 < e2; r2++) if (this._row[r2] !== n2) return false;
          return true;
        }, r.prototype._fillCounters = function(t3, e2, n2) {
          var r2, o2 = this, i = 0, a = [];
          for (n2 = void 0 === n2 || n2, t3 = void 0 !== t3 ? t3 : o2._nextUnset(o2._row), e2 = e2 || o2._row.length, a[i] = 0, r2 = t3; r2 < e2; r2++) o2._row[r2] ^ n2 ? a[i]++ : (i++, a[i] = 1, n2 = !n2);
          return a;
        }, r.prototype._toCounters = function(t3, e2) {
          var n2, r2 = this, i = e2.length, a = r2._row.length, u = !r2._row[t3], c = 0;
          for (o.a.init(e2, 0), n2 = t3; n2 < a; n2++) if (r2._row[n2] ^ u) e2[c]++;
          else {
            if (++c === i) break;
            e2[c] = 1, u = !u;
          }
          return e2;
        }, Object.defineProperty(r.prototype, "FORMAT", { value: "unknown", writeable: false }), r.DIRECTION = { FORWARD: 1, REVERSE: -1 }, r.Exception = { StartNotFoundException: "Start-Info was not found!", CodeNotFoundException: "Code could not be found!", PatternNotFoundException: "Pattern could not be found!" }, r.CONFIG_KEYS = {}, e.a = r;
      }, function(t2, e) {
        var n = Array.isArray;
        t2.exports = n;
      }, function(t2, e, n) {
        "use strict";
        e.a = { init: function(t3, e2) {
          for (var n2 = t3.length; n2--; ) t3[n2] = e2;
        }, shuffle: function(t3) {
          var e2, n2, r = t3.length - 1;
          for (r; r >= 0; r--) e2 = Math.floor(Math.random() * r), n2 = t3[r], t3[r] = t3[e2], t3[e2] = n2;
          return t3;
        }, toPointList: function(t3) {
          var e2, n2, r = [], o = [];
          for (e2 = 0; e2 < t3.length; e2++) {
            for (r = [], n2 = 0; n2 < t3[e2].length; n2++) r[n2] = t3[e2][n2];
            o[e2] = "[" + r.join(",") + "]";
          }
          return "[" + o.join(",\r\n") + "]";
        }, threshold: function(t3, e2, n2) {
          var r, o = [];
          for (r = 0; r < t3.length; r++) n2.apply(t3, [t3[r]]) >= e2 && o.push(t3[r]);
          return o;
        }, maxIndex: function(t3) {
          var e2, n2 = 0;
          for (e2 = 0; e2 < t3.length; e2++) t3[e2] > t3[n2] && (n2 = e2);
          return n2;
        }, max: function t3(e2) {
          var n2, t4 = 0;
          for (n2 = 0; n2 < e2.length; n2++) e2[n2] > t4 && (t4 = e2[n2]);
          return t4;
        }, sum: function t3(e2) {
          for (var n2 = e2.length, t4 = 0; n2--; ) t4 += e2[n2];
          return t4;
        } };
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          t3 = a()(o(), t3), u.a.call(this, t3, e2);
        }
        function o() {
          var t3 = {};
          return Object.keys(r.CONFIG_KEYS).forEach(function(e2) {
            t3[e2] = r.CONFIG_KEYS[e2].default;
          }), t3;
        }
        var i = n(28), a = n.n(i), u = n(1), c = Object.assign || function(t3) {
          for (var e2 = 1; e2 < arguments.length; e2++) {
            var n2 = arguments[e2];
            for (var r2 in n2) Object.prototype.hasOwnProperty.call(n2, r2) && (t3[r2] = n2[r2]);
          }
          return t3;
        }, s = { CODE_L_START: { value: 0 }, CODE_G_START: { value: 10 }, START_PATTERN: { value: [1, 1, 1] }, STOP_PATTERN: { value: [1, 1, 1] }, MIDDLE_PATTERN: { value: [1, 1, 1, 1, 1] }, EXTENSION_START_PATTERN: { value: [1, 1, 2] }, CODE_PATTERN: { value: [[3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2], [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2], [1, 1, 2, 3], [1, 2, 2, 2], [2, 2, 1, 2], [1, 1, 4, 1], [2, 3, 1, 1], [1, 3, 2, 1], [4, 1, 1, 1], [2, 1, 3, 1], [3, 1, 2, 1], [2, 1, 1, 3]] }, CODE_FREQUENCY: { value: [0, 11, 13, 14, 19, 25, 28, 21, 22, 26] }, SINGLE_CODE_ERROR: { value: 0.7 }, AVG_CODE_ERROR: { value: 0.48 }, FORMAT: { value: "ean_13", writeable: false } };
        r.prototype = Object.create(u.a.prototype, s), r.prototype.constructor = r, r.prototype._decodeCode = function(t3, e2) {
          var n2, r2, o2, i2 = [0, 0, 0, 0], a2 = this, u2 = t3, c2 = !a2._row[u2], s2 = 0, f = { error: Number.MAX_VALUE, code: -1, start: t3, end: t3 };
          for (e2 || (e2 = a2.CODE_PATTERN.length), n2 = u2; n2 < a2._row.length; n2++) if (a2._row[n2] ^ c2) i2[s2]++;
          else {
            if (s2 === i2.length - 1) {
              for (r2 = 0; r2 < e2; r2++) (o2 = a2._matchPattern(i2, a2.CODE_PATTERN[r2])) < f.error && (f.code = r2, f.error = o2);
              return f.end = n2, f.error > a2.AVG_CODE_ERROR ? null : f;
            }
            s2++, i2[s2] = 1, c2 = !c2;
          }
          return null;
        }, r.prototype._findPattern = function(t3, e2, n2, r2, o2) {
          var i2, a2, u2, c2, s2 = [], f = this, l = 0, d = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0 };
          for (e2 || (e2 = f._nextSet(f._row)), void 0 === n2 && (n2 = false), void 0 === r2 && (r2 = true), void 0 === o2 && (o2 = f.AVG_CODE_ERROR), i2 = 0; i2 < t3.length; i2++) s2[i2] = 0;
          for (i2 = e2; i2 < f._row.length; i2++) if (f._row[i2] ^ n2) s2[l]++;
          else {
            if (l === s2.length - 1) {
              for (c2 = 0, u2 = 0; u2 < s2.length; u2++) c2 += s2[u2];
              if ((a2 = f._matchPattern(s2, t3)) < o2) return d.error = a2, d.start = i2 - c2, d.end = i2, d;
              if (!r2) return null;
              for (u2 = 0; u2 < s2.length - 2; u2++) s2[u2] = s2[u2 + 2];
              s2[s2.length - 2] = 0, s2[s2.length - 1] = 0, l--;
            } else l++;
            s2[l] = 1, n2 = !n2;
          }
          return null;
        }, r.prototype._findStart = function() {
          for (var t3, e2, n2 = this, r2 = n2._nextSet(n2._row); !e2; ) {
            if (!(e2 = n2._findPattern(n2.START_PATTERN, r2))) return null;
            if ((t3 = e2.start - (e2.end - e2.start)) >= 0 && n2._matchRange(t3, e2.start, 0)) return e2;
            r2 = e2.end, e2 = null;
          }
        }, r.prototype._verifyTrailingWhitespace = function(t3) {
          var e2, n2 = this;
          return e2 = t3.end + (t3.end - t3.start), e2 < n2._row.length && n2._matchRange(t3.end, e2, 0) ? t3 : null;
        }, r.prototype._findEnd = function(t3, e2) {
          var n2 = this, r2 = n2._findPattern(n2.STOP_PATTERN, t3, e2, false);
          return null !== r2 ? n2._verifyTrailingWhitespace(r2) : null;
        }, r.prototype._calculateFirstDigit = function(t3) {
          var e2, n2 = this;
          for (e2 = 0; e2 < n2.CODE_FREQUENCY.length; e2++) if (t3 === n2.CODE_FREQUENCY[e2]) return e2;
          return null;
        }, r.prototype._decodePayload = function(t3, e2, n2) {
          var r2, o2, i2 = this, a2 = 0;
          for (r2 = 0; r2 < 6; r2++) {
            if (!(t3 = i2._decodeCode(t3.end))) return null;
            t3.code >= i2.CODE_G_START ? (t3.code = t3.code - i2.CODE_G_START, a2 |= 1 << 5 - r2) : a2 |= 0 << 5 - r2, e2.push(t3.code), n2.push(t3);
          }
          if (null === (o2 = i2._calculateFirstDigit(a2))) return null;
          if (e2.unshift(o2), null === (t3 = i2._findPattern(i2.MIDDLE_PATTERN, t3.end, true, false))) return null;
          for (n2.push(t3), r2 = 0; r2 < 6; r2++) {
            if (!(t3 = i2._decodeCode(t3.end, i2.CODE_G_START))) return null;
            n2.push(t3), e2.push(t3.code);
          }
          return t3;
        }, r.prototype._decode = function() {
          var t3, e2, n2 = this, r2 = [], o2 = [], i2 = {};
          if (!(t3 = n2._findStart())) return null;
          if (e2 = { code: t3.code, start: t3.start, end: t3.end }, o2.push(e2), !(e2 = n2._decodePayload(e2, r2, o2))) return null;
          if (!(e2 = n2._findEnd(e2.end, false))) return null;
          if (o2.push(e2), !n2._checksum(r2)) return null;
          if (this.supplements.length > 0) {
            var a2 = this._decodeExtensions(e2.end);
            if (!a2) return null;
            var u2 = a2.decodedCodes[a2.decodedCodes.length - 1], s2 = { start: u2.start + ((u2.end - u2.start) / 2 | 0), end: u2.end };
            if (!n2._verifyTrailingWhitespace(s2)) return null;
            i2 = { supplement: a2, code: r2.join("") + a2.code };
          }
          return c({ code: r2.join(""), start: t3.start, end: e2.end, codeset: "", startInfo: t3, decodedCodes: o2 }, i2);
        }, r.prototype._decodeExtensions = function(t3) {
          var e2, n2, r2 = this._nextSet(this._row, t3), o2 = this._findPattern(this.EXTENSION_START_PATTERN, r2, false, false);
          if (null === o2) return null;
          for (e2 = 0; e2 < this.supplements.length; e2++) if (null !== (n2 = this.supplements[e2].decode(this._row, o2.end))) return { code: n2.code, start: r2, startInfo: o2, end: n2.end, codeset: "", decodedCodes: n2.decodedCodes };
          return null;
        }, r.prototype._checksum = function(t3) {
          var e2, n2 = 0;
          for (e2 = t3.length - 2; e2 >= 0; e2 -= 2) n2 += t3[e2];
          for (n2 *= 3, e2 = t3.length - 1; e2 >= 0; e2 -= 2) n2 += t3[e2];
          return n2 % 10 == 0;
        }, r.CONFIG_KEYS = { supplements: { type: "arrayOf(string)", default: [], description: "Allowed extensions to be decoded (2 and/or 5)" } }, e.a = r;
      }, function(t2, e, n) {
        var r = n(38), o = "object" == typeof self && self && self.Object === Object && self, i = r || o || Function("return this")();
        t2.exports = i;
      }, function(t2, e) {
        function n(t3) {
          return null != t3 && "object" == typeof t3;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          var e2 = new Float32Array(2);
          return e2[0] = t3[0], e2[1] = t3[1], e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return null == t3 ? void 0 === t3 ? c : u : s && s in Object(t3) ? i(t3) : a(t3);
        }
        var o = n(11), i = n(119), a = n(146), u = "[object Null]", c = "[object Undefined]", s = o ? o.toStringTag : void 0;
        t2.exports = r;
      }, function(t2, e, n) {
        "use strict";
        e.a = { drawRect: function(t3, e2, n2, r) {
          n2.strokeStyle = r.color, n2.fillStyle = r.color, n2.lineWidth = 1, n2.beginPath(), n2.strokeRect(t3.x, t3.y, e2.x, e2.y);
        }, drawPath: function(t3, e2, n2, r) {
          n2.strokeStyle = r.color, n2.fillStyle = r.color, n2.lineWidth = r.lineWidth, n2.beginPath(), n2.moveTo(t3[0][e2.x], t3[0][e2.y]);
          for (var o = 1; o < t3.length; o++) n2.lineTo(t3[o][e2.x], t3[o][e2.y]);
          n2.closePath(), n2.stroke();
        }, drawImage: function(t3, e2, n2) {
          var r, o = n2.getImageData(0, 0, e2.x, e2.y), i = o.data, a = t3.length, u = i.length;
          if (u / a != 4) return false;
          for (; a--; ) r = t3[a], i[--u] = 255, i[--u] = r, i[--u] = r, i[--u] = r;
          return n2.putImageData(o, 0, 0), true;
        } };
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = -1, n2 = null == t3 ? 0 : t3.length;
          for (this.clear(); ++e2 < n2; ) {
            var r2 = t3[e2];
            this.set(r2[0], r2[1]);
          }
        }
        var o = n(133), i = n(134), a = n(135), u = n(136), c = n(137);
        r.prototype.clear = o, r.prototype.delete = i, r.prototype.get = a, r.prototype.has = u, r.prototype.set = c, t2.exports = r;
      }, function(t2, e, n) {
        var r = n(5), o = r.Symbol;
        t2.exports = o;
      }, function(t2, e, n) {
        function r(t3, e2) {
          for (var n2 = t3.length; n2--; ) if (o(t3[n2][0], e2)) return n2;
          return -1;
        }
        var o = n(17);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          return o(t3) ? t3 : i(t3, e2) ? [t3] : a(u(t3));
        }
        var o = n(2), i = n(130), a = n(154), u = n(165);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = t3.__data__;
          return o(e2) ? n2["string" == typeof e2 ? "string" : "hash"] : n2.map;
        }
        var o = n(131);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3, e2) {
          return !!(e2 = null == e2 ? r : e2) && ("number" == typeof t3 || o.test(t3)) && t3 > -1 && t3 % 1 == 0 && t3 < e2;
        }
        var r = 9007199254740991, o = /^(?:0|[1-9]\d*)$/;
        t2.exports = n;
      }, function(t2, e, n) {
        var r = n(22), o = r(Object, "create");
        t2.exports = o;
      }, function(t2, e) {
        function n(t3, e2) {
          return t3 === e2 || t3 !== t3 && e2 !== e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        var r = n(96), o = n(6), i = Object.prototype, a = i.hasOwnProperty, u = i.propertyIsEnumerable, c = r(/* @__PURE__ */ function() {
          return arguments;
        }()) ? r : function(t3) {
          return o(t3) && a.call(t3, "callee") && !u.call(t3, "callee");
        };
        t2.exports = c;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          return { x: t3, y: e2, toVec2: function() {
            return b.clone([this.x, this.y]);
          }, toVec3: function() {
            return E.clone([this.x, this.y, 1]);
          }, round: function() {
            return this.x = this.x > 0 ? Math.floor(this.x + 0.5) : Math.floor(this.x - 0.5), this.y = this.y > 0 ? Math.floor(this.y + 0.5) : Math.floor(this.y - 0.5), this;
          } };
        }
        function o(t3, e2, n2) {
          n2 || (n2 = t3);
          for (var r2 = t3.data, o2 = r2.length, i2 = n2.data; o2--; ) i2[o2] = r2[o2] < e2 ? 1 : 0;
        }
        function i(t3, e2) {
          e2 || (e2 = 8);
          for (var n2 = t3.data, r2 = n2.length, o2 = 8 - e2, i2 = 1 << e2, a2 = new Int32Array(i2); r2--; ) a2[n2[r2] >> o2]++;
          return a2;
        }
        function a(t3, e2) {
          function n2(t4, e3) {
            var n3, r3 = 0;
            for (n3 = t4; n3 <= e3; n3++) r3 += a2[n3];
            return r3;
          }
          function r2(t4, e3) {
            var n3, r3 = 0;
            for (n3 = t4; n3 <= e3; n3++) r3 += n3 * a2[n3];
            return r3;
          }
          function o2() {
            var o3, u3, c2, s2, f2, l2, d2, h2 = [0], p2 = (1 << e2) - 1;
            for (a2 = i(t3, e2), s2 = 1; s2 < p2; s2++) o3 = n2(0, s2), u3 = n2(s2 + 1, p2), c2 = o3 * u3, 0 === c2 && (c2 = 1), f2 = r2(0, s2) * u3, l2 = r2(s2 + 1, p2) * o3, d2 = f2 - l2, h2[s2] = d2 * d2 / c2;
            return x.a.maxIndex(h2);
          }
          e2 || (e2 = 8);
          var a2, u2 = 8 - e2;
          return o2() << u2;
        }
        function u(t3, e2) {
          var n2 = a(t3);
          return o(t3, n2, e2), n2;
        }
        function c(t3, e2, n2) {
          function r2(t4) {
            var e3 = false;
            for (i2 = 0; i2 < c2.length; i2++) a2 = c2[i2], a2.fits(t4) && (a2.add(t4), e3 = true);
            return e3;
          }
          var o2, i2, a2, u2, c2 = [];
          for (n2 || (n2 = "rad"), o2 = 0; o2 < t3.length; o2++) u2 = m.a.createPoint(t3[o2], o2, n2), r2(u2) || c2.push(m.a.create(u2, e2));
          return c2;
        }
        function s(t3, e2, n2) {
          var r2, o2, i2, a2, u2 = 0, c2 = 0, s2 = [];
          for (r2 = 0; r2 < e2; r2++) s2[r2] = { score: 0, item: null };
          for (r2 = 0; r2 < t3.length; r2++) if ((o2 = n2.apply(this, [t3[r2]])) > c2) for (i2 = s2[u2], i2.score = o2, i2.item = t3[r2], c2 = Number.MAX_VALUE, a2 = 0; a2 < e2; a2++) s2[a2].score < c2 && (c2 = s2[a2].score, u2 = a2);
          return s2;
        }
        function f(t3, e2, n2) {
          for (var r2, o2 = 0, i2 = e2.x, a2 = Math.floor(t3.length / 4), u2 = e2.x / 2, c2 = 0, s2 = e2.x; i2 < a2; ) {
            for (r2 = 0; r2 < u2; r2++) n2[c2] = (0.299 * t3[4 * o2 + 0] + 0.587 * t3[4 * o2 + 1] + 0.114 * t3[4 * o2 + 2] + (0.299 * t3[4 * (o2 + 1) + 0] + 0.587 * t3[4 * (o2 + 1) + 1] + 0.114 * t3[4 * (o2 + 1) + 2]) + (0.299 * t3[4 * i2 + 0] + 0.587 * t3[4 * i2 + 1] + 0.114 * t3[4 * i2 + 2]) + (0.299 * t3[4 * (i2 + 1) + 0] + 0.587 * t3[4 * (i2 + 1) + 1] + 0.114 * t3[4 * (i2 + 1) + 2])) / 4, c2++, o2 += 2, i2 += 2;
            o2 += s2, i2 += s2;
          }
        }
        function l(t3, e2, n2) {
          var r2, o2 = t3.length / 4 | 0;
          if (n2 && n2.singleChannel === true) for (r2 = 0; r2 < o2; r2++) e2[r2] = t3[4 * r2 + 0];
          else for (r2 = 0; r2 < o2; r2++) e2[r2] = 0.299 * t3[4 * r2 + 0] + 0.587 * t3[4 * r2 + 1] + 0.114 * t3[4 * r2 + 2];
        }
        function d(t3, e2) {
          for (var n2 = t3.data, r2 = t3.size.x, o2 = e2.data, i2 = 0, a2 = r2, u2 = n2.length, c2 = r2 / 2, s2 = 0; a2 < u2; ) {
            for (var f2 = 0; f2 < c2; f2++) o2[s2] = Math.floor((n2[i2] + n2[i2 + 1] + n2[a2] + n2[a2 + 1]) / 4), s2++, i2 += 2, a2 += 2;
            i2 += r2, a2 += r2;
          }
        }
        function h(t3, e2) {
          var n2 = t3[0], r2 = t3[1], o2 = t3[2], i2 = o2 * r2, a2 = i2 * (1 - Math.abs(n2 / 60 % 2 - 1)), u2 = o2 - i2, c2 = 0, s2 = 0, f2 = 0;
          return e2 = e2 || [0, 0, 0], n2 < 60 ? (c2 = i2, s2 = a2) : n2 < 120 ? (c2 = a2, s2 = i2) : n2 < 180 ? (s2 = i2, f2 = a2) : n2 < 240 ? (s2 = a2, f2 = i2) : n2 < 300 ? (c2 = a2, f2 = i2) : n2 < 360 && (c2 = i2, f2 = a2), e2[0] = 255 * (c2 + u2) | 0, e2[1] = 255 * (s2 + u2) | 0, e2[2] = 255 * (f2 + u2) | 0, e2;
        }
        function p(t3) {
          var e2, n2 = [], r2 = [];
          for (e2 = 1; e2 < Math.sqrt(t3) + 1; e2++) t3 % e2 == 0 && (r2.push(e2), e2 !== t3 / e2 && n2.unshift(Math.floor(t3 / e2)));
          return r2.concat(n2);
        }
        function v(t3, e2) {
          for (var n2 = 0, r2 = 0, o2 = []; n2 < t3.length && r2 < e2.length; ) t3[n2] === e2[r2] ? (o2.push(t3[n2]), n2++, r2++) : t3[n2] > e2[r2] ? r2++ : n2++;
          return o2;
        }
        function _(t3, e2) {
          function n2(t4) {
            for (var e3 = 0, n3 = t4[Math.floor(t4.length / 2)]; e3 < t4.length - 1 && t4[e3] < d2; ) e3++;
            return e3 > 0 && (n3 = Math.abs(t4[e3] - d2) > Math.abs(t4[e3 - 1] - d2) ? t4[e3 - 1] : t4[e3]), d2 / n3 < c2[f2 + 1] / c2[f2] && d2 / n3 > c2[f2 - 1] / c2[f2] ? { x: n3, y: n3 } : null;
          }
          var r2, o2 = p(e2.x), i2 = p(e2.y), a2 = Math.max(e2.x, e2.y), u2 = v(o2, i2), c2 = [8, 10, 15, 20, 32, 60, 80], s2 = { "x-small": 5, small: 4, medium: 3, large: 2, "x-large": 1 }, f2 = s2[t3] || s2.medium, l2 = c2[f2], d2 = Math.floor(a2 / l2);
          return r2 = n2(u2), r2 || (r2 = n2(p(a2))) || (r2 = n2(p(d2 * l2))), r2;
        }
        function g(t3) {
          return { value: parseFloat(t3), unit: (t3.indexOf("%"), t3.length, "%") };
        }
        function y(t3, e2, n2) {
          var r2 = { width: t3, height: e2 }, o2 = Object.keys(n2).reduce(function(t4, e3) {
            var o3 = n2[e3], i2 = g(o3), a2 = C[e3](i2, r2);
            return t4[e3] = a2, t4;
          }, {});
          return { sx: o2.left, sy: o2.top, sw: o2.right - o2.left, sh: o2.bottom - o2.top };
        }
        var m = n(50), x = n(3);
        e.b = r, e.f = u, e.g = c, e.h = s, e.c = f, e.d = l, e.i = d, e.a = h, e.e = _, e.j = y;
        var b = { clone: n(7) }, E = { clone: n(83) }, C = { top: function(t3, e2) {
          if ("%" === t3.unit) return Math.floor(e2.height * (t3.value / 100));
        }, right: function(t3, e2) {
          if ("%" === t3.unit) return Math.floor(e2.width - e2.width * (t3.value / 100));
        }, bottom: function(t3, e2) {
          if ("%" === t3.unit) return Math.floor(e2.height - e2.height * (t3.value / 100));
        }, left: function(t3, e2) {
          if ("%" === t3.unit) return Math.floor(e2.width * (t3.value / 100));
        } };
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2, n2, r2) {
          e2 ? this.data = e2 : n2 ? (this.data = new n2(t3.x * t3.y), n2 === Array && r2 && a.a.init(this.data, 0)) : (this.data = new Uint8Array(t3.x * t3.y), Uint8Array === Array && r2 && a.a.init(this.data, 0)), this.size = t3;
        }
        var o = n(53), i = n(19), a = n(3), u = { clone: n(7) };
        r.prototype.inImageWithBorder = function(t3, e2) {
          return t3.x >= e2 && t3.y >= e2 && t3.x < this.size.x - e2 && t3.y < this.size.y - e2;
        }, r.sample = function(t3, e2, n2) {
          var r2 = Math.floor(e2), o2 = Math.floor(n2), i2 = t3.size.x, a2 = o2 * t3.size.x + r2, u2 = t3.data[a2 + 0], c = t3.data[a2 + 1], s = t3.data[a2 + i2], f = t3.data[a2 + i2 + 1], l = u2 - c;
          return e2 -= r2, n2 -= o2, Math.floor(e2 * (n2 * (l - s + f) - l) + n2 * (s - u2) + u2);
        }, r.clearArray = function(t3) {
          for (var e2 = t3.length; e2--; ) t3[e2] = 0;
        }, r.prototype.subImage = function(t3, e2) {
          return new o.a(t3, e2, this);
        }, r.prototype.subImageAsCopy = function(t3, e2) {
          var n2, r2, o2 = t3.size.y, i2 = t3.size.x;
          for (n2 = 0; n2 < i2; n2++) for (r2 = 0; r2 < o2; r2++) t3.data[r2 * i2 + n2] = this.data[(e2.y + r2) * this.size.x + e2.x + n2];
        }, r.prototype.copyTo = function(t3) {
          for (var e2 = this.data.length, n2 = this.data, r2 = t3.data; e2--; ) r2[e2] = n2[e2];
        }, r.prototype.get = function(t3, e2) {
          return this.data[e2 * this.size.x + t3];
        }, r.prototype.getSafe = function(t3, e2) {
          var n2;
          if (!this.indexMapping) {
            for (this.indexMapping = { x: [], y: [] }, n2 = 0; n2 < this.size.x; n2++) this.indexMapping.x[n2] = n2, this.indexMapping.x[n2 + this.size.x] = n2;
            for (n2 = 0; n2 < this.size.y; n2++) this.indexMapping.y[n2] = n2, this.indexMapping.y[n2 + this.size.y] = n2;
          }
          return this.data[this.indexMapping.y[e2 + this.size.y] * this.size.x + this.indexMapping.x[t3 + this.size.x]];
        }, r.prototype.set = function(t3, e2, n2) {
          return this.data[e2 * this.size.x + t3] = n2, this;
        }, r.prototype.zeroBorder = function() {
          var t3, e2 = this.size.x, n2 = this.size.y, r2 = this.data;
          for (t3 = 0; t3 < e2; t3++) r2[t3] = r2[(n2 - 1) * e2 + t3] = 0;
          for (t3 = 1; t3 < n2 - 1; t3++) r2[t3 * e2] = r2[t3 * e2 + (e2 - 1)] = 0;
        }, r.prototype.invert = function() {
          for (var t3 = this.data, e2 = t3.length; e2--; ) t3[e2] = t3[e2] ? 0 : 1;
        }, r.prototype.convolve = function(t3) {
          var e2, n2, r2, o2, i2 = t3.length / 2 | 0, a2 = 0;
          for (n2 = 0; n2 < this.size.y; n2++) for (e2 = 0; e2 < this.size.x; e2++) {
            for (a2 = 0, o2 = -i2; o2 <= i2; o2++) for (r2 = -i2; r2 <= i2; r2++) a2 += t3[o2 + i2][r2 + i2] * this.getSafe(e2 + r2, n2 + o2);
            this.data[n2 * this.size.x + e2] = a2;
          }
        }, r.prototype.moments = function(t3) {
          var e2, n2, r2, o2, i2, a2, c, s, f, l, d, h, p = this.data, v = this.size.y, _ = this.size.x, g = [], y = [], m = Math.PI, x = m / 4;
          if (t3 <= 0) return y;
          for (i2 = 0; i2 < t3; i2++) g[i2] = { m00: 0, m01: 0, m10: 0, m11: 0, m02: 0, m20: 0, theta: 0, rad: 0 };
          for (n2 = 0; n2 < v; n2++) for (o2 = n2 * n2, e2 = 0; e2 < _; e2++) (r2 = p[n2 * _ + e2]) > 0 && (a2 = g[r2 - 1], a2.m00 += 1, a2.m01 += n2, a2.m10 += e2, a2.m11 += e2 * n2, a2.m02 += o2, a2.m20 += e2 * e2);
          for (i2 = 0; i2 < t3; i2++) a2 = g[i2], isNaN(a2.m00) || 0 === a2.m00 || (l = a2.m10 / a2.m00, d = a2.m01 / a2.m00, c = a2.m11 / a2.m00 - l * d, s = a2.m02 / a2.m00 - d * d, f = a2.m20 / a2.m00 - l * l, h = (s - f) / (2 * c), h = 0.5 * Math.atan(h) + (c >= 0 ? x : -x) + m, a2.theta = (180 * h / m + 90) % 180 - 90, a2.theta < 0 && (a2.theta += 180), a2.rad = h > m ? h - m : h, a2.vec = u.clone([Math.cos(h), Math.sin(h)]), y.push(a2));
          return y;
        }, r.prototype.show = function(t3, e2) {
          var n2, r2, o2, i2, a2, u2, c;
          for (e2 || (e2 = 1), n2 = t3.getContext("2d"), t3.width = this.size.x, t3.height = this.size.y, r2 = n2.getImageData(0, 0, t3.width, t3.height), o2 = r2.data, i2 = 0, c = 0; c < this.size.y; c++) for (u2 = 0; u2 < this.size.x; u2++) a2 = c * this.size.x + u2, i2 = this.get(u2, c) * e2, o2[4 * a2 + 0] = i2, o2[4 * a2 + 1] = i2, o2[4 * a2 + 2] = i2, o2[4 * a2 + 3] = 255;
          n2.putImageData(r2, 0, 0);
        }, r.prototype.overlay = function(t3, e2, r2) {
          (!e2 || e2 < 0 || e2 > 360) && (e2 = 360);
          for (var o2 = [0, 1, 1], a2 = [0, 0, 0], u2 = [255, 255, 255], c = [0, 0, 0], s = [], f = t3.getContext("2d"), l = f.getImageData(r2.x, r2.y, this.size.x, this.size.y), d = l.data, h = this.data.length; h--; ) o2[0] = this.data[h] * e2, s = o2[0] <= 0 ? u2 : o2[0] >= 360 ? c : n.i(i.a)(o2, a2), d[4 * h + 0] = s[0], d[4 * h + 1] = s[1], d[4 * h + 2] = s[2], d[4 * h + 3] = 255;
          f.putImageData(l, r2.x, r2.y);
        }, e.a = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          "__proto__" == e2 && o ? o(t3, e2, { configurable: true, enumerable: true, value: n2, writable: true }) : t3[e2] = n2;
        }
        var o = n(37);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = i(t3, e2);
          return o(n2) ? n2 : void 0;
        }
        var o = n(97), i = n(120);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          if ("string" == typeof t3 || o(t3)) return t3;
          var e2 = t3 + "";
          return "0" == e2 && 1 / t3 == -i ? "-0" : e2;
        }
        var o = n(27), i = 1 / 0;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return null != t3 && i(t3.length) && !o(t3);
        }
        var o = n(25), i = n(26);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          if (!i(t3)) return false;
          var e2 = o(t3);
          return e2 == u || e2 == c || e2 == a || e2 == s;
        }
        var o = n(8), i = n(0), a = "[object AsyncFunction]", u = "[object Function]", c = "[object GeneratorFunction]", s = "[object Proxy]";
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          return "number" == typeof t3 && t3 > -1 && t3 % 1 == 0 && t3 <= r;
        }
        var r = 9007199254740991;
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return "symbol" == typeof t3 || i(t3) && o(t3) == a;
        }
        var o = n(8), i = n(6), a = "[object Symbol]";
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(100), o = n(116), i = o(function(t3, e2, n2) {
          r(t3, e2, n2);
        });
        t2.exports = i;
      }, function(t2, e) {
        t2.exports = function(t3) {
          return t3.webpackPolyfill || (t3.deprecate = function() {
          }, t3.paths = [], t3.children || (t3.children = []), Object.defineProperty(t3, "loaded", { enumerable: true, get: function() {
            return t3.l;
          } }), Object.defineProperty(t3, "id", { enumerable: true, get: function() {
            return t3.i;
          } }), t3.webpackPolyfill = 1), t3;
        };
      }, function(t2, e, n) {
        "use strict";
        var r = { searchDirections: [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]], create: function(t3, e2) {
          function n2(t4, e3, n3, r3) {
            var o2, f, l;
            for (o2 = 0; o2 < 7; o2++) {
              if (f = t4.cy + c[t4.dir][0], l = t4.cx + c[t4.dir][1], i = f * s + l, a[i] === e3 && (0 === u[i] || u[i] === n3)) return u[i] = n3, t4.cy = f, t4.cx = l, true;
              0 === u[i] && (u[i] = r3), t4.dir = (t4.dir + 1) % 8;
            }
            return false;
          }
          function r2(t4, e3, n3) {
            return { dir: n3, x: t4, y: e3, next: null, prev: null };
          }
          function o(t4, e3, o2, i2, a2) {
            var u2, c2, s2, f = null, l = { cx: e3, cy: t4, dir: 0 };
            if (n2(l, i2, o2, a2)) {
              f = r2(e3, t4, l.dir), u2 = f, s2 = l.dir, c2 = r2(l.cx, l.cy, 0), c2.prev = u2, u2.next = c2, c2.next = null, u2 = c2;
              do
                l.dir = (l.dir + 6) % 8, n2(l, i2, o2, a2), s2 !== l.dir ? (u2.dir = l.dir, c2 = r2(l.cx, l.cy, 0), c2.prev = u2, u2.next = c2, c2.next = null, u2 = c2) : (u2.dir = s2, u2.x = l.cx, u2.y = l.cy), s2 = l.dir;
              while (l.cx !== e3 || l.cy !== t4);
              f.prev = u2.prev, u2.prev.next = f;
            }
            return f;
          }
          var i, a = t3.data, u = e2.data, c = this.searchDirections, s = t3.size.x;
          return { trace: function(t4, e3, r3, o2) {
            return n2(t4, e3, r3, o2);
          }, contourTracing: function(t4, e3, n3, r3, i2) {
            return o(t4, e3, n3, r3, i2);
          } };
        } };
        e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          o.a.call(this);
        }
        var o = n(1), i = n(3), a = { ALPHABETH_STRING: { value: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. *$/+%" }, ALPHABET: { value: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 46, 32, 42, 36, 47, 43, 37] }, CHARACTER_ENCODINGS: { value: [52, 289, 97, 352, 49, 304, 112, 37, 292, 100, 265, 73, 328, 25, 280, 88, 13, 268, 76, 28, 259, 67, 322, 19, 274, 82, 7, 262, 70, 22, 385, 193, 448, 145, 400, 208, 133, 388, 196, 148, 168, 162, 138, 42] }, ASTERISK: { value: 148 }, FORMAT: { value: "code_39", writeable: false } };
        r.prototype = Object.create(o.a.prototype, a), r.prototype.constructor = r, r.prototype._decode = function() {
          var t3, e2, n2, r2, o2 = this, a2 = [0, 0, 0, 0, 0, 0, 0, 0, 0], u = [], c = o2._findStart();
          if (!c) return null;
          r2 = o2._nextSet(o2._row, c.end);
          do {
            if (a2 = o2._toCounters(r2, a2), (n2 = o2._toPattern(a2)) < 0) return null;
            if ((t3 = o2._patternToChar(n2)) < 0) return null;
            u.push(t3), e2 = r2, r2 += i.a.sum(a2), r2 = o2._nextSet(o2._row, r2);
          } while ("*" !== t3);
          return u.pop(), u.length && o2._verifyTrailingWhitespace(e2, r2, a2) ? { code: u.join(""), start: c.start, end: r2, startInfo: c, decodedCodes: u } : null;
        }, r.prototype._verifyTrailingWhitespace = function(t3, e2, n2) {
          var r2 = i.a.sum(n2);
          return 3 * (e2 - t3 - r2) >= r2;
        }, r.prototype._patternToChar = function(t3) {
          var e2, n2 = this;
          for (e2 = 0; e2 < n2.CHARACTER_ENCODINGS.length; e2++) if (n2.CHARACTER_ENCODINGS[e2] === t3) return String.fromCharCode(n2.ALPHABET[e2]);
          return -1;
        }, r.prototype._findNextWidth = function(t3, e2) {
          var n2, r2 = Number.MAX_VALUE;
          for (n2 = 0; n2 < t3.length; n2++) t3[n2] < r2 && t3[n2] > e2 && (r2 = t3[n2]);
          return r2;
        }, r.prototype._toPattern = function(t3) {
          for (var e2, n2, r2 = t3.length, o2 = 0, i2 = r2, a2 = 0, u = this; i2 > 3; ) {
            for (o2 = u._findNextWidth(t3, o2), i2 = 0, e2 = 0, n2 = 0; n2 < r2; n2++) t3[n2] > o2 && (e2 |= 1 << r2 - 1 - n2, i2++, a2 += t3[n2]);
            if (3 === i2) {
              for (n2 = 0; n2 < r2 && i2 > 0; n2++) if (t3[n2] > o2 && (i2--, 2 * t3[n2] >= a2)) return -1;
              return e2;
            }
          }
          return -1;
        }, r.prototype._findStart = function() {
          var t3, e2, n2, r2 = this, o2 = r2._nextSet(r2._row), i2 = o2, a2 = [0, 0, 0, 0, 0, 0, 0, 0, 0], u = 0, c = false;
          for (t3 = o2; t3 < r2._row.length; t3++) if (r2._row[t3] ^ c) a2[u]++;
          else {
            if (u === a2.length - 1) {
              if (r2._toPattern(a2) === r2.ASTERISK && (n2 = Math.floor(Math.max(0, i2 - (t3 - i2) / 4)), r2._matchRange(n2, i2, 0))) return { start: i2, end: t3 };
              for (i2 += a2[0] + a2[1], e2 = 0; e2 < 7; e2++) a2[e2] = a2[e2 + 2];
              a2[7] = 0, a2[8] = 0, u--;
            } else u++;
            a2[u] = 1, c = !c;
          }
          return null;
        }, e.a = r;
      }, function(t2, e) {
        function n(t3, e2) {
          return t3[0] * e2[0] + t3[1] * e2[1];
        }
        t2.exports = n;
      }, function(t2, e, n) {
        var r = n(22), o = n(5), i = r(o, "Map");
        t2.exports = i;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = -1, n2 = null == t3 ? 0 : t3.length;
          for (this.clear(); ++e2 < n2; ) {
            var r2 = t3[e2];
            this.set(r2[0], r2[1]);
          }
        }
        var o = n(138), i = n(139), a = n(140), u = n(141), c = n(142);
        r.prototype.clear = o, r.prototype.delete = i, r.prototype.get = a, r.prototype.has = u, r.prototype.set = c, t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          (void 0 === n2 || i(t3[e2], n2)) && (void 0 !== n2 || e2 in t3) || o(t3, e2, n2);
        }
        var o = n(21), i = n(17);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          var r2 = t3[e2];
          u.call(t3, e2) && i(r2, n2) && (void 0 !== n2 || e2 in t3) || o(t3, e2, n2);
        }
        var o = n(21), i = n(17), a = Object.prototype, u = a.hasOwnProperty;
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(22), o = function() {
          try {
            var t3 = r(Object, "defineProperty");
            return t3({}, "", {}), t3;
          } catch (t4) {
          }
        }();
        t2.exports = o;
      }, function(t2, e, n) {
        (function(e2) {
          var n2 = "object" == typeof e2 && e2 && e2.Object === Object && e2;
          t2.exports = n2;
        }).call(e, n(47));
      }, function(t2, e, n) {
        var r = n(147), o = r(Object.getPrototypeOf, Object);
        t2.exports = o;
      }, function(t2, e) {
        function n(t3) {
          var e2 = t3 && t3.constructor;
          return t3 === ("function" == typeof e2 && e2.prototype || r);
        }
        var r = Object.prototype;
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          return e2 = i(void 0 === e2 ? t3.length - 1 : e2, 0), function() {
            for (var r2 = arguments, a = -1, u = i(r2.length - e2, 0), c = Array(u); ++a < u; ) c[a] = r2[e2 + a];
            a = -1;
            for (var s = Array(e2 + 1); ++a < e2; ) s[a] = r2[a];
            return s[e2] = n2(c), o(t3, this, s);
          };
        }
        var o = n(87), i = Math.max;
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(106), o = n(148), i = o(r);
        t2.exports = i;
      }, function(t2, e) {
        function n(t3) {
          return t3;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        (function(t3) {
          var r = n(5), o = n(163), i = "object" == typeof e && e && !e.nodeType && e, a = i && "object" == typeof t3 && t3 && !t3.nodeType && t3, u = a && a.exports === i, c = u ? r.Buffer : void 0, s = c ? c.isBuffer : void 0, f = s || o;
          t3.exports = f;
        }).call(e, n(29)(t2));
      }, function(t2, e, n) {
        var r = n(98), o = n(109), i = n(145), a = i && i.isTypedArray, u = a ? o(a) : r;
        t2.exports = u;
      }, function(t2, e, n) {
        function r(t3) {
          return a(t3) ? o(t3, true) : i(t3);
        }
        var o = n(88), i = n(99), a = n(24);
        t2.exports = r;
      }, function(t2, e) {
        var n;
        n = /* @__PURE__ */ function() {
          return this;
        }();
        try {
          n = n || Function("return this")() || (0, eval)("this");
        } catch (t3) {
          "object" == typeof window && (n = window);
        }
        t2.exports = n;
      }, function(e, n, r) {
        "use strict";
        function o(t2) {
          f(t2), P = k.a.create($.decoder, S);
        }
        function i(t2) {
          var e2;
          if ("VideoStream" === $.inputStream.type) e2 = document.createElement("video"), R = H.a.createVideoStream(e2);
          else if ("ImageStream" === $.inputStream.type) R = H.a.createImageStream();
          else if ("LiveStream" === $.inputStream.type) {
            var n2 = a();
            n2 && ((e2 = n2.querySelector("video")) || (e2 = document.createElement("video"), n2.appendChild(e2))), R = H.a.createLiveStream(e2), F.a.request(e2, $.inputStream.constraints).then(function() {
              R.trigger("canrecord");
            }).catch(function(e3) {
              return t2(e3);
            });
          }
          R.setAttribute("preload", "auto"), R.setInputStream($.inputStream), R.addEventListener("canrecord", u.bind(void 0, t2));
        }
        function a() {
          var t2 = $.inputStream.target;
          if (t2 && t2.nodeName && 1 === t2.nodeType) return t2;
          var e2 = "string" == typeof t2 ? t2 : "#interactive.viewport";
          return document.querySelector(e2);
        }
        function u(t2) {
          U.a.checkImageConstraints(R, $.locator), s($), w = V.a.create(R, K.dom.image), A($.numOfWorkers, function() {
            0 === $.numOfWorkers && o(), c(t2);
          });
        }
        function c(t2) {
          R.play(), t2();
        }
        function s() {
          if ("undefined" != typeof document) {
            var t2 = a();
            if (K.dom.image = document.querySelector("canvas.imgBuffer"), K.dom.image || (K.dom.image = document.createElement("canvas"), K.dom.image.className = "imgBuffer", t2 && "ImageStream" === $.inputStream.type && t2.appendChild(K.dom.image)), K.ctx.image = K.dom.image.getContext("2d"), K.dom.image.width = R.getCanvasSize().x, K.dom.image.height = R.getCanvasSize().y, K.dom.overlay = document.querySelector("canvas.drawingBuffer"), !K.dom.overlay) {
              K.dom.overlay = document.createElement("canvas"), K.dom.overlay.className = "drawingBuffer", t2 && t2.appendChild(K.dom.overlay);
              var e2 = document.createElement("br");
              e2.setAttribute("clear", "all"), t2 && t2.appendChild(e2);
            }
            K.ctx.overlay = K.dom.overlay.getContext("2d"), K.dom.overlay.width = R.getCanvasSize().x, K.dom.overlay.height = R.getCanvasSize().y;
          }
        }
        function f(t2) {
          S = t2 ? t2 : new j.a({ x: R.getWidth(), y: R.getHeight() }), D = [q.clone([0, 0]), q.clone([0, S.size.y]), q.clone([S.size.x, S.size.y]), q.clone([S.size.x, 0])], U.a.init(S, $.locator);
        }
        function l() {
          return $.locate ? U.a.locate() : [[q.clone(D[0]), q.clone(D[1]), q.clone(D[2]), q.clone(D[3])]];
        }
        function d(t2) {
          function e2(t3) {
            for (var e3 = t3.length; e3--; ) t3[e3][0] += i2, t3[e3][1] += a2;
          }
          function n2(t3) {
            t3[0].x += i2, t3[0].y += a2, t3[1].x += i2, t3[1].y += a2;
          }
          var r2, o2 = R.getTopRight(), i2 = o2.x, a2 = o2.y;
          if (0 !== i2 || 0 !== a2) {
            if (t2.barcodes) for (r2 = 0; r2 < t2.barcodes.length; r2++) d(t2.barcodes[r2]);
            if (t2.line && 2 === t2.line.length && n2(t2.line), t2.box && e2(t2.box), t2.boxes && t2.boxes.length > 0) for (r2 = 0; r2 < t2.boxes.length; r2++) e2(t2.boxes[r2]);
          }
        }
        function h(t2, e2) {
          e2 && I && (t2.barcodes ? t2.barcodes.filter(function(t3) {
            return t3.codeResult;
          }).forEach(function(t3) {
            return h(t3, e2);
          }) : t2.codeResult && I.addResult(e2, R.getCanvasSize(), t2.codeResult));
        }
        function p(t2) {
          return t2 && (t2.barcodes ? t2.barcodes.some(function(t3) {
            return t3.codeResult;
          }) : t2.codeResult);
        }
        function v(t2, e2) {
          var n2 = t2;
          t2 && Q && (d(t2), h(t2, e2), n2 = t2.barcodes || t2), L.a.publish("processed", n2), p(t2) && L.a.publish("detected", n2);
        }
        function _() {
          var t2, e2;
          e2 = l(), e2 ? (t2 = P.decodeFromBoundingBoxes(e2), t2 = t2 || {}, t2.boxes = e2, v(t2, S.data)) : v();
        }
        function g() {
          var t2;
          if (Q) {
            if (Y.length > 0) {
              if (!(t2 = Y.filter(function(t3) {
                return !t3.busy;
              })[0])) return;
              w.attachData(t2.imageData);
            } else w.attachData(S.data);
            w.grab() && (t2 ? (t2.busy = true, t2.worker.postMessage({ cmd: "process", imageData: t2.imageData }, [t2.imageData.buffer])) : _());
          } else _();
        }
        function y() {
          var t2 = null, e2 = 1e3 / ($.frequency || 60);
          T = false, function n2(r2) {
            t2 = t2 || r2, T || (r2 >= t2 && (t2 += e2, g()), window.requestAnimFrame(n2));
          }(performance.now());
        }
        function m() {
          Q && "LiveStream" === $.inputStream.type ? y() : g();
        }
        function x(t2) {
          var e2, n2 = { worker: void 0, imageData: new Uint8Array(R.getWidth() * R.getHeight()), busy: true };
          e2 = C(), n2.worker = new Worker(e2), n2.worker.onmessage = function(r2) {
            if ("initialized" === r2.data.event) return URL.revokeObjectURL(e2), n2.busy = false, n2.imageData = new Uint8Array(r2.data.imageData), t2(n2);
            "processed" === r2.data.event ? (n2.imageData = new Uint8Array(r2.data.imageData), n2.busy = false, v(r2.data.result, n2.imageData)) : r2.data.event;
          }, n2.worker.postMessage({ cmd: "init", size: { x: R.getWidth(), y: R.getHeight() }, imageData: n2.imageData, config: b($) }, [n2.imageData.buffer]);
        }
        function b(t2) {
          return X({}, t2, { inputStream: X({}, t2.inputStream, { target: null }) });
        }
        function E(t2) {
          function e2(t3) {
            self.postMessage({ event: "processed", imageData: o2.data, result: t3 }, [o2.data.buffer]);
          }
          function n2() {
            self.postMessage({ event: "initialized", imageData: o2.data }, [o2.data.buffer]);
          }
          if (t2) {
            var r2 = t2().default;
            if (!r2) return void self.postMessage({ event: "error", message: "Quagga could not be created" });
          }
          var o2;
          self.onmessage = function(t3) {
            if ("init" === t3.data.cmd) {
              var i2 = t3.data.config;
              i2.numOfWorkers = 0, o2 = new r2.ImageWrapper({ x: t3.data.size.x, y: t3.data.size.y }, new Uint8Array(t3.data.imageData)), r2.init(i2, n2, o2), r2.onProcessed(e2);
            } else "process" === t3.data.cmd ? (o2.data = new Uint8Array(t3.data.imageData), r2.start()) : "setReaders" === t3.data.cmd && r2.setReaders(t3.data.readers);
          };
        }
        function C() {
          var e2, n2;
          return void 0 !== t && (n2 = t), e2 = new Blob(["(" + E.toString() + ")(" + n2 + ");"], { type: "text/javascript" }), window.URL.createObjectURL(e2);
        }
        function O(t2) {
          P ? P.setReaders(t2) : Q && Y.length > 0 && Y.forEach(function(e2) {
            e2.worker.postMessage({ cmd: "setReaders", readers: t2 });
          });
        }
        function A(t2, e2) {
          var n2 = t2 - Y.length;
          if (0 === n2) return e2 && e2();
          if (n2 < 0) {
            return Y.slice(n2).forEach(function(t3) {
              t3.worker.terminate();
            }), Y = Y.slice(0, n2), e2 && e2();
          }
          for (var r2 = function(n3) {
            Y.push(n3), Y.length >= t2 && e2 && e2();
          }, o2 = 0; o2 < n2; o2++) x(r2);
        }
        Object.defineProperty(n, "__esModule", { value: true });
        var R, w, T, S, D, P, I, M = r(28), N = r.n(M), z = r(54), j = (r.n(z), r(20)), U = r(64), k = r(57), L = r(51), F = r(59), W = r(9), B = r(49), G = r(55), H = r(63), V = r(61), X = Object.assign || function(t2) {
          for (var e2 = 1; e2 < arguments.length; e2++) {
            var n2 = arguments[e2];
            for (var r2 in n2) Object.prototype.hasOwnProperty.call(n2, r2) && (t2[r2] = n2[r2]);
          }
          return t2;
        }, q = { clone: r(7) }, K = { ctx: { image: null, overlay: null }, dom: { image: null, overlay: null } }, Y = [], Q = true, $ = {};
        n.default = { init: function(t2, e2, n2) {
          if ($ = N()({}, G.a, t2), n2) return Q = false, o(n2), e2();
          i(e2);
        }, start: function() {
          m();
        }, stop: function() {
          T = true, A(0), "LiveStream" === $.inputStream.type && (F.a.release(), R.clearEventHandlers());
        }, pause: function() {
          T = true;
        }, onDetected: function(t2) {
          L.a.subscribe("detected", t2);
        }, offDetected: function(t2) {
          L.a.unsubscribe("detected", t2);
        }, onProcessed: function(t2) {
          L.a.subscribe("processed", t2);
        }, offProcessed: function(t2) {
          L.a.unsubscribe("processed", t2);
        }, setReaders: function(t2) {
          O(t2);
        }, registerResultCollector: function(t2) {
          t2 && "function" == typeof t2.addResult && (I = t2);
        }, canvas: K, decodeSingle: function(t2, e2) {
          var n2 = this;
          t2 = N()({ inputStream: { type: "ImageStream", sequence: false, size: 800, src: t2.src }, numOfWorkers: 1, locator: { halfSample: false } }, t2), this.init(t2, function() {
            L.a.once("processed", function(t3) {
              n2.stop(), e2.call(null, t3);
            }, true), m();
          });
        }, ImageWrapper: j.a, ImageDebug: W.a, ResultCollector: B.a, CameraAccess: F.a };
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          return !!e2 && e2.some(function(e3) {
            return Object.keys(e3).every(function(n2) {
              return e3[n2] === t3[n2];
            });
          });
        }
        function o(t3, e2) {
          return "function" != typeof e2 || e2(t3);
        }
        var i = n(9);
        e.a = { create: function(t3) {
          function e2(e3) {
            return c && e3 && !r(e3, t3.blacklist) && o(e3, t3.filter);
          }
          var n2 = document.createElement("canvas"), a = n2.getContext("2d"), u = [], c = t3.capacity || 20, s = t3.capture === true;
          return { addResult: function(t4, r2, o2) {
            var f = {};
            e2(o2) && (c--, f.codeResult = o2, s && (n2.width = r2.x, n2.height = r2.y, i.a.drawImage(t4, r2, a), f.frame = n2.toDataURL()), u.push(f));
          }, getResults: function() {
            return u;
          } };
        } };
      }, function(t2, e, n) {
        "use strict";
        var r = { clone: n(7), dot: n(32) };
        e.a = { create: function(t3, e2) {
          function n2() {
            o(t3), i();
          }
          function o(t4) {
            c[t4.id] = t4, a.push(t4);
          }
          function i() {
            var t4, e3 = 0;
            for (t4 = 0; t4 < a.length; t4++) e3 += a[t4].rad;
            u.rad = e3 / a.length, u.vec = r.clone([Math.cos(u.rad), Math.sin(u.rad)]);
          }
          var a = [], u = { rad: 0, vec: r.clone([0, 0]) }, c = {};
          return n2(), { add: function(t4) {
            c[t4.id] || (o(t4), i());
          }, fits: function(t4) {
            return Math.abs(r.dot(t4.point.vec, u.vec)) > e2;
          }, getPoints: function() {
            return a;
          }, getCenter: function() {
            return u;
          } };
        }, createPoint: function(t3, e2, n2) {
          return { rad: t3[n2], point: t3, id: e2 };
        } };
      }, function(t2, e, n) {
        "use strict";
        e.a = /* @__PURE__ */ function() {
          function t3(t4) {
            return o[t4] || (o[t4] = { subscribers: [] }), o[t4];
          }
          function e2() {
            o = {};
          }
          function n2(t4, e3) {
            t4.async ? setTimeout(function() {
              t4.callback(e3);
            }, 4) : t4.callback(e3);
          }
          function r(e3, n3, r2) {
            var o2;
            if ("function" == typeof n3) o2 = { callback: n3, async: r2 };
            else if (o2 = n3, !o2.callback) throw "Callback was not specified on options";
            t3(e3).subscribers.push(o2);
          }
          var o = {};
          return { subscribe: function(t4, e3, n3) {
            return r(t4, e3, n3);
          }, publish: function(e3, r2) {
            var o2 = t3(e3), i = o2.subscribers;
            i.filter(function(t4) {
              return !!t4.once;
            }).forEach(function(t4) {
              n2(t4, r2);
            }), o2.subscribers = i.filter(function(t4) {
              return !t4.once;
            }), o2.subscribers.forEach(function(t4) {
              n2(t4, r2);
            });
          }, once: function(t4, e3, n3) {
            r(t4, { callback: e3, async: n3, once: true });
          }, unsubscribe: function(n3, r2) {
            var o2;
            n3 ? (o2 = t3(n3), o2.subscribers = o2 && r2 ? o2.subscribers.filter(function(t4) {
              return t4.callback !== r2;
            }) : []) : e2();
          } };
        }();
      }, function(t2, e, n) {
        "use strict";
        function r() {
          return navigator.mediaDevices && "function" == typeof navigator.mediaDevices.enumerateDevices ? navigator.mediaDevices.enumerateDevices() : Promise.reject(new Error("enumerateDevices is not defined"));
        }
        function o(t3) {
          return navigator.mediaDevices && "function" == typeof navigator.mediaDevices.getUserMedia ? navigator.mediaDevices.getUserMedia(t3) : Promise.reject(new Error("getUserMedia is not defined"));
        }
        e.b = r, e.a = o;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2, n2) {
          n2 || (n2 = { data: null, size: e2 }), this.data = n2.data, this.originalSize = n2.size, this.I = n2, this.from = t3, this.size = e2;
        }
        r.prototype.show = function(t3, e2) {
          var n2, r2, o, i, a, u, c;
          for (e2 || (e2 = 1), n2 = t3.getContext("2d"), t3.width = this.size.x, t3.height = this.size.y, r2 = n2.getImageData(0, 0, t3.width, t3.height), o = r2.data, i = 0, a = 0; a < this.size.y; a++) for (u = 0; u < this.size.x; u++) c = a * this.size.x + u, i = this.get(u, a) * e2, o[4 * c + 0] = i, o[4 * c + 1] = i, o[4 * c + 2] = i, o[4 * c + 3] = 255;
          r2.data = o, n2.putImageData(r2, 0, 0);
        }, r.prototype.get = function(t3, e2) {
          return this.data[(this.from.y + e2) * this.originalSize.x + this.from.x + t3];
        }, r.prototype.updateData = function(t3) {
          this.originalSize = t3.size, this.data = t3.data;
        }, r.prototype.updateFrom = function(t3) {
          return this.from = t3, this;
        }, e.a = r;
      }, function(t2, e) {
        "undefined" != typeof window && (window.requestAnimFrame = function() {
          return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(t3) {
            window.setTimeout(t3, 1e3 / 60);
          };
        }()), Math.imul = Math.imul || function(t3, e2) {
          var n = t3 >>> 16 & 65535, r = 65535 & t3, o = e2 >>> 16 & 65535, i = 65535 & e2;
          return r * i + (n * i + r * o << 16 >>> 0) | 0;
        }, "function" != typeof Object.assign && (Object.assign = function(t3) {
          "use strict";
          if (null === t3) throw new TypeError("Cannot convert undefined or null to object");
          for (var e2 = Object(t3), n = 1; n < arguments.length; n++) {
            var r = arguments[n];
            if (null !== r) for (var o in r) Object.prototype.hasOwnProperty.call(r, o) && (e2[o] = r[o]);
          }
          return e2;
        });
      }, function(t2, e, n) {
        "use strict";
        var r = void 0;
        r = n(56), e.a = r;
      }, function(t2, e) {
        t2.exports = { inputStream: { name: "Live", type: "LiveStream", constraints: { width: 640, height: 480, facingMode: "environment" }, area: { top: "0%", right: "0%", left: "0%", bottom: "0%" }, singleChannel: false }, locate: true, numOfWorkers: 4, decoder: { readers: ["code_128_reader"] }, locator: { halfSample: true, patchSize: "medium" } };
      }, function(t2, e, n) {
        "use strict";
        var r = n(58), o = (n(9), n(69)), i = n(4), a = n(31), u = n(70), c = n(68), s = n(77), f = n(74), l = n(72), d = n(73), h = n(76), p = n(75), v = n(67), _ = n(71), g = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t3) {
          return typeof t3;
        } : function(t3) {
          return t3 && "function" == typeof Symbol && t3.constructor === Symbol && t3 !== Symbol.prototype ? "symbol" : typeof t3;
        }, y = { code_128_reader: o.a, ean_reader: i.a, ean_5_reader: d.a, ean_2_reader: l.a, ean_8_reader: f.a, code_39_reader: a.a, code_39_vin_reader: u.a, codabar_reader: c.a, upc_reader: s.a, upc_e_reader: h.a, i2of5_reader: p.a, "2of5_reader": v.a, code_93_reader: _.a };
        e.a = { create: function(t3, e2) {
          function n2() {
          }
          function o2() {
            t3.readers.forEach(function(t4) {
              var e3, n3 = {}, r2 = [];
              "object" === (void 0 === t4 ? "undefined" : g(t4)) ? (e3 = t4.format, n3 = t4.config) : "string" == typeof t4 && (e3 = t4), n3.supplements && (r2 = n3.supplements.map(function(t5) {
                return new y[t5]();
              })), h2.push(new y[e3](n3, r2));
            });
          }
          function i2() {
          }
          function a2(t4, n3, r2) {
            function o3(e3) {
              var r3 = { y: e3 * Math.sin(n3), x: e3 * Math.cos(n3) };
              t4[0].y -= r3.y, t4[0].x -= r3.x, t4[1].y += r3.y, t4[1].x += r3.x;
            }
            for (o3(r2); r2 > 1 && (!e2.inImageWithBorder(t4[0], 0) || !e2.inImageWithBorder(t4[1], 0)); ) r2 -= Math.ceil(r2 / 2), o3(-r2);
            return t4;
          }
          function u2(t4) {
            return [{ x: (t4[1][0] - t4[0][0]) / 2 + t4[0][0], y: (t4[1][1] - t4[0][1]) / 2 + t4[0][1] }, { x: (t4[3][0] - t4[2][0]) / 2 + t4[2][0], y: (t4[3][1] - t4[2][1]) / 2 + t4[2][1] }];
          }
          function c2(t4) {
            var n3, o3 = null, i3 = r.a.getBarcodeLine(e2, t4[0], t4[1]);
            for (r.a.toBinaryLine(i3), n3 = 0; n3 < h2.length && null === o3; n3++) o3 = h2[n3].decodePattern(i3.line);
            return null === o3 ? null : { codeResult: o3, barcodeLine: i3 };
          }
          function s2(t4, e3, n3) {
            var r2, o3, i3, a3 = Math.sqrt(Math.pow(t4[1][0] - t4[0][0], 2) + Math.pow(t4[1][1] - t4[0][1], 2)), u3 = 16, s3 = null, f3 = Math.sin(n3), l3 = Math.cos(n3);
            for (r2 = 1; r2 < u3 && null === s3; r2++) o3 = a3 / u3 * r2 * (r2 % 2 == 0 ? -1 : 1), i3 = { y: o3 * f3, x: o3 * l3 }, e3[0].y += i3.x, e3[0].x -= i3.y, e3[1].y += i3.x, e3[1].x -= i3.y, s3 = c2(e3);
            return s3;
          }
          function f2(t4) {
            return Math.sqrt(Math.pow(Math.abs(t4[1].y - t4[0].y), 2) + Math.pow(Math.abs(t4[1].x - t4[0].x), 2));
          }
          function l2(t4) {
            var e3, n3, r2, o3;
            d2.ctx.overlay;
            return e3 = u2(t4), o3 = f2(e3), n3 = Math.atan2(e3[1].y - e3[0].y, e3[1].x - e3[0].x), null === (e3 = a2(e3, n3, Math.floor(0.1 * o3))) ? null : (r2 = c2(e3), null === r2 && (r2 = s2(t4, e3, n3)), null === r2 ? null : { codeResult: r2.codeResult, line: e3, angle: n3, pattern: r2.barcodeLine.line, threshold: r2.barcodeLine.threshold });
          }
          var d2 = { ctx: { frequency: null, pattern: null, overlay: null }, dom: { frequency: null, pattern: null, overlay: null } }, h2 = [];
          return n2(), o2(), i2(), { decodeFromBoundingBox: function(t4) {
            return l2(t4);
          }, decodeFromBoundingBoxes: function(e3) {
            var n3, r2, o3 = [], i3 = t3.multiple;
            for (n3 = 0; n3 < e3.length; n3++) {
              var a3 = e3[n3];
              if (r2 = l2(a3) || {}, r2.box = a3, i3) o3.push(r2);
              else if (r2.codeResult) return r2;
            }
            if (i3) return { barcodes: o3 };
          }, setReaders: function(e3) {
            t3.readers = e3, h2.length = 0, o2();
          } };
        } };
      }, function(t2, e, n) {
        "use strict";
        var r = (n(20), {}), o = { DIR: { UP: 1, DOWN: -1 } };
        r.getBarcodeLine = function(t3, e2, n2) {
          function r2(t4, e3) {
            l = y[e3 * m + t4], x += l, b = l < b ? l : b, E = l > E ? l : E, g.push(l);
          }
          var o2, i, a, u, c, s, f, l, d = 0 | e2.x, h = 0 | e2.y, p = 0 | n2.x, v = 0 | n2.y, _ = Math.abs(v - h) > Math.abs(p - d), g = [], y = t3.data, m = t3.size.x, x = 0, b = 255, E = 0;
          for (_ && (s = d, d = h, h = s, s = p, p = v, v = s), d > p && (s = d, d = p, p = s, s = h, h = v, v = s), o2 = p - d, i = Math.abs(v - h), a = o2 / 2 | 0, c = h, u = h < v ? 1 : -1, f = d; f < p; f++) _ ? r2(c, f) : r2(f, c), (a -= i) < 0 && (c += u, a += o2);
          return { line: g, min: b, max: E };
        }, r.toBinaryLine = function(t3) {
          var e2, n2, r2, i, a, u, c = t3.min, s = t3.max, f = t3.line, l = c + (s - c) / 2, d = [], h = (s - c) / 12, p = -h;
          for (r2 = f[0] > l ? o.DIR.UP : o.DIR.DOWN, d.push({ pos: 0, val: f[0] }), a = 0; a < f.length - 2; a++) e2 = f[a + 1] - f[a], n2 = f[a + 2] - f[a + 1], i = e2 + n2 < p && f[a + 1] < 1.5 * l ? o.DIR.DOWN : e2 + n2 > h && f[a + 1] > 0.5 * l ? o.DIR.UP : r2, r2 !== i && (d.push({ pos: a, val: f[a] }), r2 = i);
          for (d.push({ pos: f.length, val: f[f.length - 1] }), u = d[0].pos; u < d[1].pos; u++) f[u] = f[u] > l ? 0 : 1;
          for (a = 1; a < d.length - 1; a++) for (h = d[a + 1].val > d[a].val ? d[a].val + (d[a + 1].val - d[a].val) / 3 * 2 | 0 : d[a + 1].val + (d[a].val - d[a + 1].val) / 3 | 0, u = d[a].pos; u < d[a + 1].pos; u++) f[u] = f[u] > h ? 0 : 1;
          return { line: f, threshold: h };
        }, r.debug = { printFrequency: function(t3, e2) {
          var n2, r2 = e2.getContext("2d");
          for (e2.width = t3.length, e2.height = 256, r2.beginPath(), r2.strokeStyle = "blue", n2 = 0; n2 < t3.length; n2++) r2.moveTo(n2, 255), r2.lineTo(n2, 255 - t3[n2]);
          r2.stroke(), r2.closePath();
        }, printPattern: function(t3, e2) {
          var n2, r2 = e2.getContext("2d");
          for (e2.width = t3.length, r2.fillColor = "black", n2 = 0; n2 < t3.length; n2++) 1 === t3[n2] && r2.fillRect(n2, 0, 1, 100);
        } }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r(t3) {
          return new Promise(function(e2, n2) {
            function r2() {
              o2 > 0 ? t3.videoWidth > 10 && t3.videoHeight > 10 ? e2() : window.setTimeout(r2, 500) : n2("Unable to play video stream. Is webcam working?"), o2--;
            }
            var o2 = 10;
            r2();
          });
        }
        function o(t3, e2) {
          return n.i(d.a)(e2).then(function(e3) {
            return new Promise(function(n2) {
              s = e3, t3.setAttribute("autoplay", true), t3.setAttribute("muted", true), t3.setAttribute("playsinline", true), t3.srcObject = e3, t3.addEventListener("loadedmetadata", function() {
                t3.play(), n2();
              });
            });
          }).then(r.bind(null, t3));
        }
        function i(t3) {
          var e2 = l()(t3, ["width", "height", "facingMode", "aspectRatio", "deviceId"]);
          return void 0 !== t3.minAspectRatio && t3.minAspectRatio > 0 && (e2.aspectRatio = t3.minAspectRatio, console.log("WARNING: Constraint 'minAspectRatio' is deprecated; Use 'aspectRatio' instead")), void 0 !== t3.facing && (e2.facingMode = t3.facing, console.log("WARNING: Constraint 'facing' is deprecated. Use 'facingMode' instead'")), e2;
        }
        function a(t3) {
          var e2 = { audio: false, video: i(t3) };
          return e2.video.deviceId && e2.video.facingMode && delete e2.video.facingMode, Promise.resolve(e2);
        }
        function u() {
          return n.i(d.b)().then(function(t3) {
            return t3.filter(function(t4) {
              return "videoinput" === t4.kind;
            });
          });
        }
        function c() {
          if (s) {
            var t3 = s.getVideoTracks();
            if (t3 && t3.length) return t3[0];
          }
        }
        var s, f = n(162), l = n.n(f), d = n(52);
        e.a = { request: function(t3, e2) {
          return a(e2).then(o.bind(null, t3));
        }, release: function() {
          var t3 = s && s.getVideoTracks();
          t3 && t3.length && t3[0].stop(), s = null;
        }, enumerateVideoDevices: u, getActiveStreamLabel: function() {
          var t3 = c();
          return t3 ? t3.label : "";
        }, getActiveTrack: c };
      }, function(t2, e, n) {
        "use strict";
        function r(t3) {
          var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : d;
          return /^blob\:/i.test(t3) ? i(t3).then(o).then(function(t4) {
            return a(t4, e2);
          }) : Promise.resolve(null);
        }
        function o(t3) {
          return new Promise(function(e2) {
            var n2 = new FileReader();
            n2.onload = function(t4) {
              return e2(t4.target.result);
            }, n2.readAsArrayBuffer(t3);
          });
        }
        function i(t3) {
          return new Promise(function(e2, n2) {
            var r2 = new XMLHttpRequest();
            r2.open("GET", t3, true), r2.responseType = "blob", r2.onreadystatechange = function() {
              r2.readyState !== XMLHttpRequest.DONE || 200 !== r2.status && 0 !== r2.status || e2(this.response);
            }, r2.onerror = n2, r2.send();
          });
        }
        function a(t3) {
          var e2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : d, n2 = new DataView(t3), r2 = t3.byteLength, o2 = e2.reduce(function(t4, e3) {
            var n3 = Object.keys(l).filter(function(t5) {
              return l[t5] === e3;
            })[0];
            return n3 && (t4[n3] = e3), t4;
          }, {}), i2 = 2;
          if (255 !== n2.getUint8(0) || 216 !== n2.getUint8(1)) return false;
          for (; i2 < r2; ) {
            if (255 !== n2.getUint8(i2)) return false;
            if (225 === n2.getUint8(i2 + 1)) return u(n2, i2 + 4, o2);
            i2 += 2 + n2.getUint16(i2 + 2);
          }
        }
        function u(t3, e2, n2) {
          if ("Exif" !== f(t3, e2, 4)) return false;
          var r2 = e2 + 6, o2 = void 0;
          if (18761 === t3.getUint16(r2)) o2 = false;
          else {
            if (19789 !== t3.getUint16(r2)) return false;
            o2 = true;
          }
          if (42 !== t3.getUint16(r2 + 2, !o2)) return false;
          var i2 = t3.getUint32(r2 + 4, !o2);
          return !(i2 < 8) && c(t3, r2, r2 + i2, n2, o2);
        }
        function c(t3, e2, n2, r2, o2) {
          for (var i2 = t3.getUint16(n2, !o2), a2 = {}, u2 = 0; u2 < i2; u2++) {
            var c2 = n2 + 12 * u2 + 2, f2 = r2[t3.getUint16(c2, !o2)];
            f2 && (a2[f2] = s(t3, c2, e2, n2, o2));
          }
          return a2;
        }
        function s(t3, e2, n2, r2, o2) {
          var i2 = t3.getUint16(e2 + 2, !o2), a2 = t3.getUint32(e2 + 4, !o2);
          switch (i2) {
            case 3:
              if (1 === a2) return t3.getUint16(e2 + 8, !o2);
          }
        }
        function f(t3, e2, n2) {
          for (var r2 = "", o2 = e2; o2 < e2 + n2; o2++) r2 += String.fromCharCode(t3.getUint8(o2));
          return r2;
        }
        e.a = r;
        var l = { 274: "orientation" }, d = Object.keys(l).map(function(t3) {
          return l[t3];
        });
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          t3.width !== e2.x && (t3.width = e2.x), t3.height !== e2.y && (t3.height = e2.y);
        }
        var o = n(19), i = Math.PI / 180, a = {};
        a.create = function(t3, e2) {
          var a2, u = {}, c = t3.getConfig(), s = (n.i(o.b)(t3.getRealWidth(), t3.getRealHeight()), t3.getCanvasSize()), f = n.i(o.b)(t3.getWidth(), t3.getHeight()), l = t3.getTopRight(), d = l.x, h = l.y, p = null, v = null;
          return a2 = e2 ? e2 : document.createElement("canvas"), a2.width = s.x, a2.height = s.y, p = a2.getContext("2d"), v = new Uint8Array(f.x * f.y), u.attachData = function(t4) {
            v = t4;
          }, u.getData = function() {
            return v;
          }, u.grab = function() {
            var e3, u2 = c.halfSample, l2 = t3.getFrame(), _ = l2, g = 0;
            if (_) {
              if (r(a2, s), "ImageStream" === c.type && (_ = l2.img, l2.tags && l2.tags.orientation)) switch (l2.tags.orientation) {
                case 6:
                  g = 90 * i;
                  break;
                case 8:
                  g = -90 * i;
              }
              return 0 !== g ? (p.translate(s.x / 2, s.y / 2), p.rotate(g), p.drawImage(_, -s.y / 2, -s.x / 2, s.y, s.x), p.rotate(-g), p.translate(-s.x / 2, -s.y / 2)) : p.drawImage(_, 0, 0, s.x, s.y), e3 = p.getImageData(d, h, f.x, f.y).data, u2 ? n.i(o.c)(e3, f, v) : n.i(o.d)(e3, v, c), true;
            }
            return false;
          }, u.getSize = function() {
            return f;
          }, u;
        }, e.a = a;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          t3.onload = function() {
            e2.loaded(this);
          };
        }
        var o = n(60), i = {};
        i.load = function(t3, e2, i2, a, u) {
          var c, s, f, l = new Array(a), d = new Array(l.length);
          if (u === false) l[0] = t3;
          else for (c = 0; c < l.length; c++) f = i2 + c, l[c] = t3 + "image-" + ("00" + f).slice(-3) + ".jpg";
          for (d.notLoaded = [], d.addImage = function(t4) {
            d.notLoaded.push(t4);
          }, d.loaded = function(r2) {
            for (var i3 = d.notLoaded, a2 = 0; a2 < i3.length; a2++) if (i3[a2] === r2) {
              i3.splice(a2, 1);
              for (var c2 = 0; c2 < l.length; c2++) {
                var s2 = l[c2].substr(l[c2].lastIndexOf("/"));
                if (r2.src.lastIndexOf(s2) !== -1) {
                  d[c2] = { img: r2 };
                  break;
                }
              }
              break;
            }
            0 === i3.length && (u === false ? n.i(o.a)(t3, ["orientation"]).then(function(t4) {
              d[0].tags = t4, e2(d);
            }).catch(function(t4) {
              console.log(t4), e2(d);
            }) : e2(d));
          }, c = 0; c < l.length; c++) s = new Image(), d.addImage(s), r(s, d), s.src = l[c];
        }, e.a = i;
      }, function(t2, e, n) {
        "use strict";
        var r = n(62), o = {};
        o.createVideoStream = function(t3) {
          function e2() {
            var e3 = t3.videoWidth, o3 = t3.videoHeight;
            n2 = i.size ? e3 / o3 > 1 ? i.size : Math.floor(e3 / o3 * i.size) : e3, r2 = i.size ? e3 / o3 > 1 ? Math.floor(o3 / e3 * i.size) : i.size : o3, s.x = n2, s.y = r2;
          }
          var n2, r2, o2 = {}, i = null, a = ["canrecord", "ended"], u = {}, c = { x: 0, y: 0 }, s = { x: 0, y: 0 };
          return o2.getRealWidth = function() {
            return t3.videoWidth;
          }, o2.getRealHeight = function() {
            return t3.videoHeight;
          }, o2.getWidth = function() {
            return n2;
          }, o2.getHeight = function() {
            return r2;
          }, o2.setWidth = function(t4) {
            n2 = t4;
          }, o2.setHeight = function(t4) {
            r2 = t4;
          }, o2.setInputStream = function(e3) {
            i = e3, t3.src = void 0 !== e3.src ? e3.src : "";
          }, o2.ended = function() {
            return t3.ended;
          }, o2.getConfig = function() {
            return i;
          }, o2.setAttribute = function(e3, n3) {
            t3.setAttribute(e3, n3);
          }, o2.pause = function() {
            t3.pause();
          }, o2.play = function() {
            t3.play();
          }, o2.setCurrentTime = function(e3) {
            "LiveStream" !== i.type && (t3.currentTime = e3);
          }, o2.addEventListener = function(e3, n3, r3) {
            a.indexOf(e3) !== -1 ? (u[e3] || (u[e3] = []), u[e3].push(n3)) : t3.addEventListener(e3, n3, r3);
          }, o2.clearEventHandlers = function() {
            a.forEach(function(e3) {
              var n3 = u[e3];
              n3 && n3.length > 0 && n3.forEach(function(n4) {
                t3.removeEventListener(e3, n4);
              });
            });
          }, o2.trigger = function(t4, n3) {
            var r3, i2 = u[t4];
            if ("canrecord" === t4 && e2(), i2 && i2.length > 0) for (r3 = 0; r3 < i2.length; r3++) i2[r3].apply(o2, n3);
          }, o2.setTopRight = function(t4) {
            c.x = t4.x, c.y = t4.y;
          }, o2.getTopRight = function() {
            return c;
          }, o2.setCanvasSize = function(t4) {
            s.x = t4.x, s.y = t4.y;
          }, o2.getCanvasSize = function() {
            return s;
          }, o2.getFrame = function() {
            return t3;
          }, o2;
        }, o.createLiveStream = function(t3) {
          t3.setAttribute("autoplay", true);
          var e2 = o.createVideoStream(t3);
          return e2.ended = function() {
            return false;
          }, e2;
        }, o.createImageStream = function() {
          function t3() {
            l = false, r.a.load(v, function(t4) {
              if (d = t4, t4[0].tags && t4[0].tags.orientation) switch (t4[0].tags.orientation) {
                case 6:
                case 8:
                  u = t4[0].img.height, c = t4[0].img.width;
                  break;
                default:
                  u = t4[0].img.width, c = t4[0].img.height;
              }
              else u = t4[0].img.width, c = t4[0].img.height;
              n2 = a.size ? u / c > 1 ? a.size : Math.floor(u / c * a.size) : u, o2 = a.size ? u / c > 1 ? Math.floor(c / u * a.size) : a.size : c, x.x = n2, x.y = o2, l = true, s = 0, setTimeout(function() {
                e2("canrecord", []);
              }, 0);
            }, p, h, a.sequence);
          }
          function e2(t4, e3) {
            var n3, r2 = y[t4];
            if (r2 && r2.length > 0) for (n3 = 0; n3 < r2.length; n3++) r2[n3].apply(i, e3);
          }
          var n2, o2, i = {}, a = null, u = 0, c = 0, s = 0, f = true, l = false, d = null, h = 0, p = 1, v = null, _ = false, g = ["canrecord", "ended"], y = {}, m = { x: 0, y: 0 }, x = { x: 0, y: 0 };
          return i.trigger = e2, i.getWidth = function() {
            return n2;
          }, i.getHeight = function() {
            return o2;
          }, i.setWidth = function(t4) {
            n2 = t4;
          }, i.setHeight = function(t4) {
            o2 = t4;
          }, i.getRealWidth = function() {
            return u;
          }, i.getRealHeight = function() {
            return c;
          }, i.setInputStream = function(e3) {
            a = e3, e3.sequence === false ? (v = e3.src, h = 1) : (v = e3.src, h = e3.length), t3();
          }, i.ended = function() {
            return _;
          }, i.setAttribute = function() {
          }, i.getConfig = function() {
            return a;
          }, i.pause = function() {
            f = true;
          }, i.play = function() {
            f = false;
          }, i.setCurrentTime = function(t4) {
            s = t4;
          }, i.addEventListener = function(t4, e3) {
            g.indexOf(t4) !== -1 && (y[t4] || (y[t4] = []), y[t4].push(e3));
          }, i.setTopRight = function(t4) {
            m.x = t4.x, m.y = t4.y;
          }, i.getTopRight = function() {
            return m;
          }, i.setCanvasSize = function(t4) {
            x.x = t4.x, x.y = t4.y;
          }, i.getCanvasSize = function() {
            return x;
          }, i.getFrame = function() {
            var t4;
            return l ? (f || (t4 = d[s], s < h - 1 ? s++ : setTimeout(function() {
              _ = true, e2("ended", []);
            }, 0)), t4) : null;
          }, i;
        }, e.a = o;
      }, function(t2, e, n) {
        "use strict";
        (function(t3) {
          function r() {
            var e2;
            v = p.halfSample ? new R.a({ x: O.size.x / 2 | 0, y: O.size.y / 2 | 0 }) : O, C = n.i(w.e)(p.patchSize, v.size), z.x = v.size.x / C.x | 0, z.y = v.size.y / C.y | 0, E = new R.a(v.size, void 0, Uint8Array, false), y = new R.a(C, void 0, Array, true), e2 = new ArrayBuffer(65536), g = new R.a(C, new Uint8Array(e2, 0, C.x * C.y)), _ = new R.a(C, new Uint8Array(e2, C.x * C.y * 3, C.x * C.y), void 0, true), A = n.i(P.a)("undefined" != typeof window ? window : "undefined" != typeof self ? self : t3, { size: C.x }, e2), b = new R.a({ x: v.size.x / g.size.x | 0, y: v.size.y / g.size.y | 0 }, void 0, Array, true), m = new R.a(b.size, void 0, void 0, true), x = new R.a(b.size, void 0, Int32Array, true);
          }
          function o() {
            p.useWorker || "undefined" == typeof document || (N.dom.binary = document.createElement("canvas"), N.dom.binary.className = "binaryBuffer", N.ctx.binary = N.dom.binary.getContext("2d"), N.dom.binary.width = E.size.x, N.dom.binary.height = E.size.y);
          }
          function i(t4) {
            var e2, n2, r2, o2, i2, a2, u2, c2 = E.size.x, s2 = E.size.y, f2 = -E.size.x, l2 = -E.size.y;
            for (e2 = 0, n2 = 0; n2 < t4.length; n2++) o2 = t4[n2], e2 += o2.rad;
            for (e2 /= t4.length, e2 = (180 * e2 / Math.PI + 90) % 180 - 90, e2 < 0 && (e2 += 180), e2 = (180 - e2) * Math.PI / 180, i2 = M.copy(M.create(), [Math.cos(e2), Math.sin(e2), -Math.sin(e2), Math.cos(e2)]), n2 = 0; n2 < t4.length; n2++) for (o2 = t4[n2], r2 = 0; r2 < 4; r2++) I.transformMat2(o2.box[r2], o2.box[r2], i2);
            for (n2 = 0; n2 < t4.length; n2++) for (o2 = t4[n2], r2 = 0; r2 < 4; r2++) o2.box[r2][0] < c2 && (c2 = o2.box[r2][0]), o2.box[r2][0] > f2 && (f2 = o2.box[r2][0]), o2.box[r2][1] < s2 && (s2 = o2.box[r2][1]), o2.box[r2][1] > l2 && (l2 = o2.box[r2][1]);
            for (a2 = [[c2, s2], [f2, s2], [f2, l2], [c2, l2]], u2 = p.halfSample ? 2 : 1, i2 = M.invert(i2, i2), r2 = 0; r2 < 4; r2++) I.transformMat2(a2[r2], a2[r2], i2);
            for (r2 = 0; r2 < 4; r2++) I.scale(a2[r2], a2[r2], u2);
            return a2;
          }
          function a() {
            n.i(w.f)(v, E), E.zeroBorder();
          }
          function u() {
            var t4, e2, n2, r2, o2, i2, a2, u2 = [];
            for (t4 = 0; t4 < z.x; t4++) for (e2 = 0; e2 < z.y; e2++) n2 = g.size.x * t4, r2 = g.size.y * e2, l(n2, r2), _.zeroBorder(), T.a.init(y.data, 0), i2 = S.a.create(_, y), a2 = i2.rasterize(0), o2 = y.moments(a2.count), u2 = u2.concat(d(o2, [t4, e2], n2, r2));
            return u2;
          }
          function c(t4) {
            var e2, n2, r2 = [];
            for (e2 = 0; e2 < t4; e2++) r2.push(0);
            for (n2 = x.data.length; n2--; ) x.data[n2] > 0 && r2[x.data[n2] - 1]++;
            return r2 = r2.map(function(t5, e3) {
              return { val: t5, label: e3 + 1 };
            }), r2.sort(function(t5, e3) {
              return e3.val - t5.val;
            }), r2.filter(function(t5) {
              return t5.val >= 5;
            });
          }
          function s(t4, e2) {
            var n2, r2, o2, a2, u2 = [], c2 = [];
            for (n2 = 0; n2 < t4.length; n2++) {
              for (r2 = x.data.length, u2.length = 0; r2--; ) x.data[r2] === t4[n2].label && (o2 = b.data[r2], u2.push(o2));
              a2 = i(u2), a2 && c2.push(a2);
            }
            return c2;
          }
          function f(t4) {
            var e2 = n.i(w.g)(t4, 0.9), r2 = n.i(w.h)(e2, 1, function(t5) {
              return t5.getPoints().length;
            }), o2 = [], i2 = [];
            if (1 === r2.length) {
              o2 = r2[0].item.getPoints();
              for (var a2 = 0; a2 < o2.length; a2++) i2.push(o2[a2].point);
            }
            return i2;
          }
          function l(t4, e2) {
            E.subImageAsCopy(g, n.i(w.b)(t4, e2)), A.skeletonize();
          }
          function d(t4, e2, n2, r2) {
            var o2, i2, a2, u2, c2 = [], s2 = [], l2 = Math.ceil(C.x / 3);
            if (t4.length >= 2) {
              for (o2 = 0; o2 < t4.length; o2++) t4[o2].m00 > l2 && c2.push(t4[o2]);
              if (c2.length >= 2) {
                for (a2 = f(c2), i2 = 0, o2 = 0; o2 < a2.length; o2++) i2 += a2[o2].rad;
                a2.length > 1 && a2.length >= c2.length / 4 * 3 && a2.length > t4.length / 4 && (i2 /= a2.length, u2 = { index: e2[1] * z.x + e2[0], pos: { x: n2, y: r2 }, box: [I.clone([n2, r2]), I.clone([n2 + g.size.x, r2]), I.clone([n2 + g.size.x, r2 + g.size.y]), I.clone([n2, r2 + g.size.y])], moments: a2, rad: i2, vec: I.clone([Math.cos(i2), Math.sin(i2)]) }, s2.push(u2));
              }
            }
            return s2;
          }
          function h(t4) {
            function e2() {
              var t5;
              for (t5 = 0; t5 < x.data.length; t5++) if (0 === x.data[t5] && 1 === m.data[t5]) return t5;
              return x.length;
            }
            function n2(t5) {
              var e3, r3, o3, u3, c2, s2 = { x: t5 % x.size.x, y: t5 / x.size.x | 0 };
              if (t5 < x.data.length) for (o3 = b.data[t5], x.data[t5] = i2, c2 = 0; c2 < D.a.searchDirections.length; c2++) r3 = s2.y + D.a.searchDirections[c2][0], e3 = s2.x + D.a.searchDirections[c2][1], u3 = r3 * x.size.x + e3, 0 !== m.data[u3] ? 0 === x.data[u3] && Math.abs(I.dot(b.data[u3].vec, o3.vec)) > a2 && n2(u3) : x.data[u3] = Number.MAX_VALUE;
            }
            var r2, o2, i2 = 0, a2 = 0.95, u2 = 0;
            for (T.a.init(m.data, 0), T.a.init(x.data, 0), T.a.init(b.data, null), r2 = 0; r2 < t4.length; r2++) o2 = t4[r2], b.data[o2.index] = o2, m.data[o2.index] = 1;
            for (m.zeroBorder(); (u2 = e2()) < x.data.length; ) i2++, n2(u2);
            return i2;
          }
          var p, v, _, g, y, m, x, b, E, C, O, A, R = n(20), w = n(19), T = n(3), S = (n(9), n(65)), D = n(30), P = n(66), I = { clone: n(7), dot: n(32), scale: n(81), transformMat2: n(82) }, M = { copy: n(78), create: n(79), invert: n(80) }, N = { ctx: { binary: null }, dom: { binary: null } }, z = { x: 0, y: 0 };
          e.a = { init: function(t4, e2) {
            p = e2, O = t4, r(), o();
          }, locate: function() {
            var t4, e2;
            if (p.halfSample && n.i(w.i)(O, v), a(), t4 = u(), t4.length < z.x * z.y * 0.05) return null;
            var r2 = h(t4);
            return r2 < 1 ? null : (e2 = c(r2), 0 === e2.length ? null : s(e2, r2));
          }, checkImageConstraints: function(t4, e2) {
            var r2, o2, i2, a2 = t4.getWidth(), u2 = t4.getHeight(), c2 = e2.halfSample ? 0.5 : 1;
            if (t4.getConfig().area && (i2 = n.i(w.j)(a2, u2, t4.getConfig().area), t4.setTopRight({ x: i2.sx, y: i2.sy }), t4.setCanvasSize({ x: a2, y: u2 }), a2 = i2.sw, u2 = i2.sh), o2 = { x: Math.floor(a2 * c2), y: Math.floor(u2 * c2) }, r2 = n.i(w.e)(e2.patchSize, o2), t4.setWidth(Math.floor(Math.floor(o2.x / r2.x) * (1 / c2) * r2.x)), t4.setHeight(Math.floor(Math.floor(o2.y / r2.y) * (1 / c2) * r2.y)), t4.getWidth() % r2.x == 0 && t4.getHeight() % r2.y == 0) return true;
            throw new Error("Image dimensions do not comply with the current settings: Width (" + a2 + " )and height (" + u2 + ") must a multiple of " + r2.x);
          } };
        }).call(e, n(47));
      }, function(t2, e, n) {
        "use strict";
        var r = n(30), o = { createContour2D: function() {
          return { dir: null, index: null, firstVertex: null, insideContours: null, nextpeer: null, prevpeer: null };
        }, CONTOUR_DIR: { CW_DIR: 0, CCW_DIR: 1, UNKNOWN_DIR: 2 }, DIR: { OUTSIDE_EDGE: -32767, INSIDE_EDGE: -32766 }, create: function(t3, e2) {
          var n2 = t3.data, i = e2.data, a = t3.size.x, u = t3.size.y, c = r.a.create(t3, e2);
          return { rasterize: function(t4) {
            var e3, r2, s, f, l, d, h, p, v, _, g, y, m = [], x = 0;
            for (y = 0; y < 400; y++) m[y] = 0;
            for (m[0] = n2[0], v = null, d = 1; d < u - 1; d++) for (f = 0, r2 = m[0], l = 1; l < a - 1; l++) if (g = d * a + l, 0 === i[g]) if ((e3 = n2[g]) !== r2) {
              if (0 === f) s = x + 1, m[s] = e3, r2 = e3, null !== (h = c.contourTracing(d, l, s, e3, o.DIR.OUTSIDE_EDGE)) && (x++, f = s, p = o.createContour2D(), p.dir = o.CONTOUR_DIR.CW_DIR, p.index = f, p.firstVertex = h, p.nextpeer = v, p.insideContours = null, null !== v && (v.prevpeer = p), v = p);
              else if (null !== (h = c.contourTracing(d, l, o.DIR.INSIDE_EDGE, e3, f))) {
                for (p = o.createContour2D(), p.firstVertex = h, p.insideContours = null, p.dir = 0 === t4 ? o.CONTOUR_DIR.CCW_DIR : o.CONTOUR_DIR.CW_DIR, p.index = t4, _ = v; null !== _ && _.index !== f; ) _ = _.nextpeer;
                null !== _ && (p.nextpeer = _.insideContours, null !== _.insideContours && (_.insideContours.prevpeer = p), _.insideContours = p);
              }
            } else i[g] = f;
            else i[g] === o.DIR.OUTSIDE_EDGE || i[g] === o.DIR.INSIDE_EDGE ? (f = 0, r2 = i[g] === o.DIR.INSIDE_EDGE ? n2[g] : m[0]) : (f = i[g], r2 = m[f]);
            for (_ = v; null !== _; ) _.index = t4, _ = _.nextpeer;
            return { cc: v, count: x };
          }, debug: { drawContour: function(t4, e3) {
            var n3, r2, i2, a2 = t4.getContext("2d"), u2 = e3;
            for (a2.strokeStyle = "red", a2.fillStyle = "red", a2.lineWidth = 1, n3 = null !== u2 ? u2.insideContours : null; null !== u2; ) {
              switch (null !== n3 ? (r2 = n3, n3 = n3.nextpeer) : (r2 = u2, u2 = u2.nextpeer, n3 = null !== u2 ? u2.insideContours : null), r2.dir) {
                case o.CONTOUR_DIR.CW_DIR:
                  a2.strokeStyle = "red";
                  break;
                case o.CONTOUR_DIR.CCW_DIR:
                  a2.strokeStyle = "blue";
                  break;
                case o.CONTOUR_DIR.UNKNOWN_DIR:
                  a2.strokeStyle = "green";
              }
              i2 = r2.firstVertex, a2.beginPath(), a2.moveTo(i2.x, i2.y);
              do
                i2 = i2.next, a2.lineTo(i2.x, i2.y);
              while (i2 !== r2.firstVertex);
              a2.stroke();
            }
          } } };
        } };
        e.a = o;
      }, function(module2, __webpack_exports__, __webpack_require__) {
        "use strict";
        function Skeletonizer(stdlib, foreign, buffer) {
          ;
          var images = new stdlib.Uint8Array(buffer), size = foreign.size | 0, imul = stdlib.Math.imul;
          function erode(inImagePtr, outImagePtr) {
            inImagePtr = inImagePtr | 0;
            outImagePtr = outImagePtr | 0;
            var v = 0, u = 0, sum = 0, yStart1 = 0, yStart2 = 0, xStart1 = 0, xStart2 = 0, offset = 0;
            for (v = 1; (v | 0) < (size - 1 | 0); v = v + 1 | 0) {
              offset = offset + size | 0;
              for (u = 1; (u | 0) < (size - 1 | 0); u = u + 1 | 0) {
                yStart1 = offset - size | 0;
                yStart2 = offset + size | 0;
                xStart1 = u - 1 | 0;
                xStart2 = u + 1 | 0;
                sum = (images[inImagePtr + yStart1 + xStart1 | 0] | 0) + (images[inImagePtr + yStart1 + xStart2 | 0] | 0) + (images[inImagePtr + offset + u | 0] | 0) + (images[inImagePtr + yStart2 + xStart1 | 0] | 0) + (images[inImagePtr + yStart2 + xStart2 | 0] | 0) | 0;
                if ((sum | 0) == (5 | 0)) {
                  images[outImagePtr + offset + u | 0] = 1;
                } else {
                  images[outImagePtr + offset + u | 0] = 0;
                }
              }
            }
            return;
          }
          function subtract(aImagePtr, bImagePtr, outImagePtr) {
            aImagePtr = aImagePtr | 0;
            bImagePtr = bImagePtr | 0;
            outImagePtr = outImagePtr | 0;
            var length = 0;
            length = imul(size, size) | 0;
            while ((length | 0) > 0) {
              length = length - 1 | 0;
              images[outImagePtr + length | 0] = (images[aImagePtr + length | 0] | 0) - (images[bImagePtr + length | 0] | 0) | 0;
            }
          }
          function bitwiseOr(aImagePtr, bImagePtr, outImagePtr) {
            aImagePtr = aImagePtr | 0;
            bImagePtr = bImagePtr | 0;
            outImagePtr = outImagePtr | 0;
            var length = 0;
            length = imul(size, size) | 0;
            while ((length | 0) > 0) {
              length = length - 1 | 0;
              images[outImagePtr + length | 0] = images[aImagePtr + length | 0] | 0 | (images[bImagePtr + length | 0] | 0) | 0;
            }
          }
          function countNonZero(imagePtr) {
            imagePtr = imagePtr | 0;
            var sum = 0, length = 0;
            length = imul(size, size) | 0;
            while ((length | 0) > 0) {
              length = length - 1 | 0;
              sum = (sum | 0) + (images[imagePtr + length | 0] | 0) | 0;
            }
            return sum | 0;
          }
          function init(imagePtr, value) {
            imagePtr = imagePtr | 0;
            value = value | 0;
            var length = 0;
            length = imul(size, size) | 0;
            while ((length | 0) > 0) {
              length = length - 1 | 0;
              images[imagePtr + length | 0] = value;
            }
          }
          function dilate(inImagePtr, outImagePtr) {
            inImagePtr = inImagePtr | 0;
            outImagePtr = outImagePtr | 0;
            var v = 0, u = 0, sum = 0, yStart1 = 0, yStart2 = 0, xStart1 = 0, xStart2 = 0, offset = 0;
            for (v = 1; (v | 0) < (size - 1 | 0); v = v + 1 | 0) {
              offset = offset + size | 0;
              for (u = 1; (u | 0) < (size - 1 | 0); u = u + 1 | 0) {
                yStart1 = offset - size | 0;
                yStart2 = offset + size | 0;
                xStart1 = u - 1 | 0;
                xStart2 = u + 1 | 0;
                sum = (images[inImagePtr + yStart1 + xStart1 | 0] | 0) + (images[inImagePtr + yStart1 + xStart2 | 0] | 0) + (images[inImagePtr + offset + u | 0] | 0) + (images[inImagePtr + yStart2 + xStart1 | 0] | 0) + (images[inImagePtr + yStart2 + xStart2 | 0] | 0) | 0;
                if ((sum | 0) > (0 | 0)) {
                  images[outImagePtr + offset + u | 0] = 1;
                } else {
                  images[outImagePtr + offset + u | 0] = 0;
                }
              }
            }
            return;
          }
          function memcpy(srcImagePtr, dstImagePtr) {
            srcImagePtr = srcImagePtr | 0;
            dstImagePtr = dstImagePtr | 0;
            var length = 0;
            length = imul(size, size) | 0;
            while ((length | 0) > 0) {
              length = length - 1 | 0;
              images[dstImagePtr + length | 0] = images[srcImagePtr + length | 0] | 0;
            }
          }
          function zeroBorder(imagePtr) {
            imagePtr = imagePtr | 0;
            var x = 0, y = 0;
            for (x = 0; (x | 0) < (size - 1 | 0); x = x + 1 | 0) {
              images[imagePtr + x | 0] = 0;
              images[imagePtr + y | 0] = 0;
              y = y + size - 1 | 0;
              images[imagePtr + y | 0] = 0;
              y = y + 1 | 0;
            }
            for (x = 0; (x | 0) < (size | 0); x = x + 1 | 0) {
              images[imagePtr + y | 0] = 0;
              y = y + 1 | 0;
            }
          }
          function skeletonize() {
            var subImagePtr = 0, erodedImagePtr = 0, tempImagePtr = 0, skelImagePtr = 0, sum = 0, done = 0;
            erodedImagePtr = imul(size, size) | 0;
            tempImagePtr = erodedImagePtr + erodedImagePtr | 0;
            skelImagePtr = tempImagePtr + erodedImagePtr | 0;
            init(skelImagePtr, 0);
            zeroBorder(subImagePtr);
            do {
              erode(subImagePtr, erodedImagePtr);
              dilate(erodedImagePtr, tempImagePtr);
              subtract(subImagePtr, tempImagePtr, tempImagePtr);
              bitwiseOr(skelImagePtr, tempImagePtr, skelImagePtr);
              memcpy(erodedImagePtr, subImagePtr);
              sum = countNonZero(subImagePtr) | 0;
              done = (sum | 0) == 0 | 0;
            } while (!done);
          }
          return { skeletonize };
        }
        __webpack_exports__["a"] = Skeletonizer;
      }, function(t2, e, n) {
        "use strict";
        function r(t3) {
          o.a.call(this, t3), this.barSpaceRatio = [1, 1];
        }
        var o = n(1), i = 1, a = 3, u = { START_PATTERN: { value: [a, i, a, i, i, i] }, STOP_PATTERN: { value: [a, i, i, i, a] }, CODE_PATTERN: { value: [[i, i, a, a, i], [a, i, i, i, a], [i, a, i, i, a], [a, a, i, i, i], [i, i, a, i, a], [a, i, a, i, i], [i, a, a, i, i], [i, i, i, a, a], [a, i, i, a, i], [i, a, i, a, i]] }, SINGLE_CODE_ERROR: { value: 0.78, writable: true }, AVG_CODE_ERROR: { value: 0.3, writable: true }, FORMAT: { value: "2of5" } }, c = u.START_PATTERN.value.reduce(function(t3, e2) {
          return t3 + e2;
        }, 0);
        r.prototype = Object.create(o.a.prototype, u), r.prototype.constructor = r, r.prototype._findPattern = function(t3, e2, n2, r2) {
          var o2, i2, a2, u2, c2 = [], s = this, f = 0, l = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0 }, d = s.AVG_CODE_ERROR;
          for (n2 = n2 || false, r2 = r2 || false, e2 || (e2 = s._nextSet(s._row)), o2 = 0; o2 < t3.length; o2++) c2[o2] = 0;
          for (o2 = e2; o2 < s._row.length; o2++) if (s._row[o2] ^ n2) c2[f]++;
          else {
            if (f === c2.length - 1) {
              for (u2 = 0, a2 = 0; a2 < c2.length; a2++) u2 += c2[a2];
              if ((i2 = s._matchPattern(c2, t3)) < d) return l.error = i2, l.start = o2 - u2, l.end = o2, l;
              if (!r2) return null;
              for (a2 = 0; a2 < c2.length - 2; a2++) c2[a2] = c2[a2 + 2];
              c2[c2.length - 2] = 0, c2[c2.length - 1] = 0, f--;
            } else f++;
            c2[f] = 1, n2 = !n2;
          }
          return null;
        }, r.prototype._findStart = function() {
          for (var t3, e2, n2 = this, r2 = n2._nextSet(n2._row), o2 = 1; !e2; ) {
            if (!(e2 = n2._findPattern(n2.START_PATTERN, r2, false, true))) return null;
            if (o2 = Math.floor((e2.end - e2.start) / c), (t3 = e2.start - 5 * o2) >= 0 && n2._matchRange(t3, e2.start, 0)) return e2;
            r2 = e2.end, e2 = null;
          }
        }, r.prototype._verifyTrailingWhitespace = function(t3) {
          var e2, n2 = this;
          return e2 = t3.end + (t3.end - t3.start) / 2, e2 < n2._row.length && n2._matchRange(t3.end, e2, 0) ? t3 : null;
        }, r.prototype._findEnd = function() {
          var t3, e2, n2, r2 = this;
          return r2._row.reverse(), n2 = r2._nextSet(r2._row), t3 = r2._findPattern(r2.STOP_PATTERN, n2, false, true), r2._row.reverse(), null === t3 ? null : (e2 = t3.start, t3.start = r2._row.length - t3.end, t3.end = r2._row.length - e2, null !== t3 ? r2._verifyTrailingWhitespace(t3) : null);
        }, r.prototype._decodeCode = function(t3) {
          var e2, n2, r2, o2 = this, i2 = 0, a2 = o2.AVG_CODE_ERROR, u2 = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0 };
          for (e2 = 0; e2 < t3.length; e2++) i2 += t3[e2];
          for (r2 = 0; r2 < o2.CODE_PATTERN.length; r2++) (n2 = o2._matchPattern(t3, o2.CODE_PATTERN[r2])) < u2.error && (u2.code = r2, u2.error = n2);
          if (u2.error < a2) return u2;
        }, r.prototype._decodePayload = function(t3, e2, n2) {
          for (var r2, o2, i2 = this, a2 = 0, u2 = t3.length, c2 = [0, 0, 0, 0, 0]; a2 < u2; ) {
            for (r2 = 0; r2 < 5; r2++) c2[r2] = t3[a2] * this.barSpaceRatio[0], a2 += 2;
            if (!(o2 = i2._decodeCode(c2))) return null;
            e2.push(o2.code + ""), n2.push(o2);
          }
          return o2;
        }, r.prototype._verifyCounterLength = function(t3) {
          return t3.length % 10 == 0;
        }, r.prototype._decode = function() {
          var t3, e2, n2, r2 = this, o2 = [], i2 = [];
          return (t3 = r2._findStart()) ? (i2.push(t3), (e2 = r2._findEnd()) ? (n2 = r2._fillCounters(t3.end, e2.start, false), r2._verifyCounterLength(n2) && r2._decodePayload(n2, o2, i2) ? o2.length < 5 ? null : (i2.push(e2), { code: o2.join(""), start: t3.start, end: e2.end, startInfo: t3, decodedCodes: i2 }) : null) : null) : null;
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          o.a.call(this), this._counters = [];
        }
        var o = n(1), i = { ALPHABETH_STRING: { value: "0123456789-$:/.+ABCD" }, ALPHABET: { value: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 45, 36, 58, 47, 46, 43, 65, 66, 67, 68] }, CHARACTER_ENCODINGS: { value: [3, 6, 9, 96, 18, 66, 33, 36, 48, 72, 12, 24, 69, 81, 84, 21, 26, 41, 11, 14] }, START_END: { value: [26, 41, 11, 14] }, MIN_ENCODED_CHARS: { value: 4 }, MAX_ACCEPTABLE: { value: 2 }, PADDING: { value: 1.5 }, FORMAT: { value: "codabar", writeable: false } };
        r.prototype = Object.create(o.a.prototype, i), r.prototype.constructor = r, r.prototype._decode = function() {
          var t3, e2, n2, r2, o2, i2 = this, a = [];
          if (this._counters = i2._fillCounters(), !(t3 = i2._findStart())) return null;
          r2 = t3.startCounter;
          do {
            if ((n2 = i2._toPattern(r2)) < 0) return null;
            if ((e2 = i2._patternToChar(n2)) < 0) return null;
            if (a.push(e2), r2 += 8, a.length > 1 && i2._isStartEnd(n2)) break;
          } while (r2 < i2._counters.length);
          return a.length - 2 < i2.MIN_ENCODED_CHARS || !i2._isStartEnd(n2) ? null : i2._verifyWhitespace(t3.startCounter, r2 - 8) && i2._validateResult(a, t3.startCounter) ? (r2 = r2 > i2._counters.length ? i2._counters.length : r2, o2 = t3.start + i2._sumCounters(t3.startCounter, r2 - 8), { code: a.join(""), start: t3.start, end: o2, startInfo: t3, decodedCodes: a }) : null;
        }, r.prototype._verifyWhitespace = function(t3, e2) {
          return (t3 - 1 <= 0 || this._counters[t3 - 1] >= this._calculatePatternLength(t3) / 2) && (e2 + 8 >= this._counters.length || this._counters[e2 + 7] >= this._calculatePatternLength(e2) / 2);
        }, r.prototype._calculatePatternLength = function(t3) {
          var e2, n2 = 0;
          for (e2 = t3; e2 < t3 + 7; e2++) n2 += this._counters[e2];
          return n2;
        }, r.prototype._thresholdResultPattern = function(t3, e2) {
          var n2, r2, o2, i2, a, u = this, c = { space: { narrow: { size: 0, counts: 0, min: 0, max: Number.MAX_VALUE }, wide: { size: 0, counts: 0, min: 0, max: Number.MAX_VALUE } }, bar: { narrow: { size: 0, counts: 0, min: 0, max: Number.MAX_VALUE }, wide: { size: 0, counts: 0, min: 0, max: Number.MAX_VALUE } } }, s = e2;
          for (o2 = 0; o2 < t3.length; o2++) {
            for (a = u._charToPattern(t3[o2]), i2 = 6; i2 >= 0; i2--) n2 = 2 == (1 & i2) ? c.bar : c.space, r2 = 1 == (1 & a) ? n2.wide : n2.narrow, r2.size += u._counters[s + i2], r2.counts++, a >>= 1;
            s += 8;
          }
          return ["space", "bar"].forEach(function(t4) {
            var e3 = c[t4];
            e3.wide.min = Math.floor((e3.narrow.size / e3.narrow.counts + e3.wide.size / e3.wide.counts) / 2), e3.narrow.max = Math.ceil(e3.wide.min), e3.wide.max = Math.ceil((e3.wide.size * u.MAX_ACCEPTABLE + u.PADDING) / e3.wide.counts);
          }), c;
        }, r.prototype._charToPattern = function(t3) {
          var e2, n2 = this, r2 = t3.charCodeAt(0);
          for (e2 = 0; e2 < n2.ALPHABET.length; e2++) if (n2.ALPHABET[e2] === r2) return n2.CHARACTER_ENCODINGS[e2];
          return 0;
        }, r.prototype._validateResult = function(t3, e2) {
          var n2, r2, o2, i2, a, u, c = this, s = c._thresholdResultPattern(t3, e2), f = e2;
          for (n2 = 0; n2 < t3.length; n2++) {
            for (u = c._charToPattern(t3[n2]), r2 = 6; r2 >= 0; r2--) {
              if (o2 = 0 == (1 & r2) ? s.bar : s.space, i2 = 1 == (1 & u) ? o2.wide : o2.narrow, (a = c._counters[f + r2]) < i2.min || a > i2.max) return false;
              u >>= 1;
            }
            f += 8;
          }
          return true;
        }, r.prototype._patternToChar = function(t3) {
          var e2, n2 = this;
          for (e2 = 0; e2 < n2.CHARACTER_ENCODINGS.length; e2++) if (n2.CHARACTER_ENCODINGS[e2] === t3) return String.fromCharCode(n2.ALPHABET[e2]);
          return -1;
        }, r.prototype._computeAlternatingThreshold = function(t3, e2) {
          var n2, r2, o2 = Number.MAX_VALUE, i2 = 0;
          for (n2 = t3; n2 < e2; n2 += 2) r2 = this._counters[n2], r2 > i2 && (i2 = r2), r2 < o2 && (o2 = r2);
          return (o2 + i2) / 2 | 0;
        }, r.prototype._toPattern = function(t3) {
          var e2, n2, r2, o2, i2 = 7, a = t3 + i2, u = 1 << i2 - 1, c = 0;
          if (a > this._counters.length) return -1;
          for (e2 = this._computeAlternatingThreshold(t3, a), n2 = this._computeAlternatingThreshold(t3 + 1, a), r2 = 0; r2 < i2; r2++) o2 = 0 == (1 & r2) ? e2 : n2, this._counters[t3 + r2] > o2 && (c |= u), u >>= 1;
          return c;
        }, r.prototype._isStartEnd = function(t3) {
          var e2;
          for (e2 = 0; e2 < this.START_END.length; e2++) if (this.START_END[e2] === t3) return true;
          return false;
        }, r.prototype._sumCounters = function(t3, e2) {
          var n2, r2 = 0;
          for (n2 = t3; n2 < e2; n2++) r2 += this._counters[n2];
          return r2;
        }, r.prototype._findStart = function() {
          var t3, e2, n2, r2 = this, o2 = r2._nextUnset(r2._row);
          for (t3 = 1; t3 < this._counters.length; t3++) if ((e2 = r2._toPattern(t3)) !== -1 && r2._isStartEnd(e2)) return o2 += r2._sumCounters(0, t3), n2 = o2 + r2._sumCounters(t3, t3 + 8), { start: o2, end: n2, startCounter: t3, endCounter: t3 + 8 };
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          i.a.call(this);
        }
        function o(t3, e2, n2) {
          for (var r2 = n2.length, o2 = 0, i2 = 0; r2--; ) i2 += t3[n2[r2]], o2 += e2[n2[r2]];
          return i2 / o2;
        }
        var i = n(1), a = { CODE_SHIFT: { value: 98 }, CODE_C: { value: 99 }, CODE_B: { value: 100 }, CODE_A: { value: 101 }, START_CODE_A: { value: 103 }, START_CODE_B: { value: 104 }, START_CODE_C: { value: 105 }, STOP_CODE: { value: 106 }, CODE_PATTERN: { value: [[2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1], [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2]] }, SINGLE_CODE_ERROR: { value: 0.64 }, AVG_CODE_ERROR: { value: 0.3 }, FORMAT: { value: "code_128", writeable: false }, MODULE_INDICES: { value: { bar: [0, 2, 4], space: [1, 3, 5] } } };
        r.prototype = Object.create(i.a.prototype, a), r.prototype.constructor = r, r.prototype._decodeCode = function(t3, e2) {
          var n2, r2, i2, a2 = [0, 0, 0, 0, 0, 0], u = this, c = t3, s = !u._row[c], f = 0, l = { error: Number.MAX_VALUE, code: -1, start: t3, end: t3, correction: { bar: 1, space: 1 } };
          for (n2 = c; n2 < u._row.length; n2++) if (u._row[n2] ^ s) a2[f]++;
          else {
            if (f === a2.length - 1) {
              for (e2 && u._correct(a2, e2), r2 = 0; r2 < u.CODE_PATTERN.length; r2++) (i2 = u._matchPattern(a2, u.CODE_PATTERN[r2])) < l.error && (l.code = r2, l.error = i2);
              return l.end = n2, l.code === -1 || l.error > u.AVG_CODE_ERROR ? null : (u.CODE_PATTERN[l.code] && (l.correction.bar = o(u.CODE_PATTERN[l.code], a2, this.MODULE_INDICES.bar), l.correction.space = o(u.CODE_PATTERN[l.code], a2, this.MODULE_INDICES.space)), l);
            }
            f++, a2[f] = 1, s = !s;
          }
          return null;
        }, r.prototype._correct = function(t3, e2) {
          this._correctBars(t3, e2.bar, this.MODULE_INDICES.bar), this._correctBars(t3, e2.space, this.MODULE_INDICES.space);
        }, r.prototype._findStart = function() {
          var t3, e2, n2, r2, i2, a2 = [0, 0, 0, 0, 0, 0], u = this, c = u._nextSet(u._row), s = false, f = 0, l = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0, correction: { bar: 1, space: 1 } };
          for (t3 = c; t3 < u._row.length; t3++) if (u._row[t3] ^ s) a2[f]++;
          else {
            if (f === a2.length - 1) {
              for (i2 = 0, r2 = 0; r2 < a2.length; r2++) i2 += a2[r2];
              for (e2 = u.START_CODE_A; e2 <= u.START_CODE_C; e2++) (n2 = u._matchPattern(a2, u.CODE_PATTERN[e2])) < l.error && (l.code = e2, l.error = n2);
              if (l.error < u.AVG_CODE_ERROR) return l.start = t3 - i2, l.end = t3, l.correction.bar = o(u.CODE_PATTERN[l.code], a2, this.MODULE_INDICES.bar), l.correction.space = o(u.CODE_PATTERN[l.code], a2, this.MODULE_INDICES.space), l;
              for (r2 = 0; r2 < 4; r2++) a2[r2] = a2[r2 + 2];
              a2[4] = 0, a2[5] = 0, f--;
            } else f++;
            a2[f] = 1, s = !s;
          }
          return null;
        }, r.prototype._decode = function() {
          var t3, e2, n2 = this, r2 = n2._findStart(), o2 = null, i2 = false, a2 = [], u = 0, c = 0, s = [], f = [], l = false, d = true;
          if (null === r2) return null;
          switch (o2 = { code: r2.code, start: r2.start, end: r2.end, correction: { bar: r2.correction.bar, space: r2.correction.space } }, f.push(o2), c = o2.code, o2.code) {
            case n2.START_CODE_A:
              t3 = n2.CODE_A;
              break;
            case n2.START_CODE_B:
              t3 = n2.CODE_B;
              break;
            case n2.START_CODE_C:
              t3 = n2.CODE_C;
              break;
            default:
              return null;
          }
          for (; !i2; ) {
            if (e2 = l, l = false, null !== (o2 = n2._decodeCode(o2.end, o2.correction))) switch (o2.code !== n2.STOP_CODE && (d = true), o2.code !== n2.STOP_CODE && (s.push(o2.code), u++, c += u * o2.code), f.push(o2), t3) {
              case n2.CODE_A:
                if (o2.code < 64) a2.push(String.fromCharCode(32 + o2.code));
                else if (o2.code < 96) a2.push(String.fromCharCode(o2.code - 64));
                else switch (o2.code !== n2.STOP_CODE && (d = false), o2.code) {
                  case n2.CODE_SHIFT:
                    l = true, t3 = n2.CODE_B;
                    break;
                  case n2.CODE_B:
                    t3 = n2.CODE_B;
                    break;
                  case n2.CODE_C:
                    t3 = n2.CODE_C;
                    break;
                  case n2.STOP_CODE:
                    i2 = true;
                }
                break;
              case n2.CODE_B:
                if (o2.code < 96) a2.push(String.fromCharCode(32 + o2.code));
                else switch (o2.code !== n2.STOP_CODE && (d = false), o2.code) {
                  case n2.CODE_SHIFT:
                    l = true, t3 = n2.CODE_A;
                    break;
                  case n2.CODE_A:
                    t3 = n2.CODE_A;
                    break;
                  case n2.CODE_C:
                    t3 = n2.CODE_C;
                    break;
                  case n2.STOP_CODE:
                    i2 = true;
                }
                break;
              case n2.CODE_C:
                if (o2.code < 100) a2.push(o2.code < 10 ? "0" + o2.code : o2.code);
                else switch (o2.code !== n2.STOP_CODE && (d = false), o2.code) {
                  case n2.CODE_A:
                    t3 = n2.CODE_A;
                    break;
                  case n2.CODE_B:
                    t3 = n2.CODE_B;
                    break;
                  case n2.STOP_CODE:
                    i2 = true;
                }
            }
            else i2 = true;
            e2 && (t3 = t3 === n2.CODE_A ? n2.CODE_B : n2.CODE_A);
          }
          return null === o2 ? null : (o2.end = n2._nextUnset(n2._row, o2.end), n2._verifyTrailingWhitespace(o2) ? (c -= u * s[s.length - 1]) % 103 !== s[s.length - 1] ? null : a2.length ? (d && a2.splice(a2.length - 1, 1), { code: a2.join(""), start: r2.start, end: o2.end, codeset: t3, startInfo: r2, decodedCodes: f, endInfo: o2 }) : null : null);
        }, i.a.prototype._verifyTrailingWhitespace = function(t3) {
          var e2, n2 = this;
          return e2 = t3.end + (t3.end - t3.start) / 2, e2 < n2._row.length && n2._matchRange(t3.end, e2, 0) ? t3 : null;
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          o.a.call(this);
        }
        var o = n(31), i = { IOQ: /[IOQ]/g, AZ09: /[A-Z0-9]{17}/ };
        r.prototype = Object.create(o.a.prototype), r.prototype.constructor = r, r.prototype._decode = function() {
          var t3 = o.a.prototype._decode.apply(this);
          if (!t3) return null;
          var e2 = t3.code;
          return e2 ? (e2 = e2.replace(i.IOQ, ""), e2.match(i.AZ09) && this._checkChecksum(e2) ? (t3.code = e2, t3) : null) : null;
        }, r.prototype._checkChecksum = function(t3) {
          return !!t3;
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          o.a.call(this);
        }
        var o = n(1), i = n(3), a = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%abcd*", u = { ALPHABETH_STRING: { value: a }, ALPHABET: { value: a.split("").map(function(t3) {
          return t3.charCodeAt(0);
        }) }, CHARACTER_ENCODINGS: { value: [276, 328, 324, 322, 296, 292, 290, 336, 274, 266, 424, 420, 418, 404, 402, 394, 360, 356, 354, 308, 282, 344, 332, 326, 300, 278, 436, 434, 428, 422, 406, 410, 364, 358, 310, 314, 302, 468, 466, 458, 366, 374, 430, 294, 474, 470, 306, 350] }, ASTERISK: { value: 350 }, FORMAT: { value: "code_93", writeable: false } };
        r.prototype = Object.create(o.a.prototype, u), r.prototype.constructor = r, r.prototype._decode = function() {
          var t3, e2, n2, r2, o2 = this, a2 = [0, 0, 0, 0, 0, 0], u2 = [], c = o2._findStart();
          if (!c) return null;
          r2 = o2._nextSet(o2._row, c.end);
          do {
            if (a2 = o2._toCounters(r2, a2), (n2 = o2._toPattern(a2)) < 0) return null;
            if ((t3 = o2._patternToChar(n2)) < 0) return null;
            u2.push(t3), e2 = r2, r2 += i.a.sum(a2), r2 = o2._nextSet(o2._row, r2);
          } while ("*" !== t3);
          return u2.pop(), u2.length && o2._verifyEnd(e2, r2, a2) && o2._verifyChecksums(u2) ? (u2 = u2.slice(0, u2.length - 2), null === (u2 = o2._decodeExtended(u2)) ? null : { code: u2.join(""), start: c.start, end: r2, startInfo: c, decodedCodes: u2 }) : null;
        }, r.prototype._verifyEnd = function(t3, e2) {
          return !(t3 === e2 || !this._row[e2]);
        }, r.prototype._patternToChar = function(t3) {
          var e2, n2 = this;
          for (e2 = 0; e2 < n2.CHARACTER_ENCODINGS.length; e2++) if (n2.CHARACTER_ENCODINGS[e2] === t3) return String.fromCharCode(n2.ALPHABET[e2]);
          return -1;
        }, r.prototype._toPattern = function(t3) {
          for (var e2 = t3.length, n2 = 0, r2 = 0, o2 = 0; o2 < e2; o2++) r2 += t3[o2];
          for (var i2 = 0; i2 < e2; i2++) {
            var a2 = Math.round(9 * t3[i2] / r2);
            if (a2 < 1 || a2 > 4) return -1;
            if (0 == (1 & i2)) for (var u2 = 0; u2 < a2; u2++) n2 = n2 << 1 | 1;
            else n2 <<= a2;
          }
          return n2;
        }, r.prototype._findStart = function() {
          var t3, e2, n2, r2 = this, o2 = r2._nextSet(r2._row), i2 = o2, a2 = [0, 0, 0, 0, 0, 0], u2 = 0, c = false;
          for (t3 = o2; t3 < r2._row.length; t3++) if (r2._row[t3] ^ c) a2[u2]++;
          else {
            if (u2 === a2.length - 1) {
              if (r2._toPattern(a2) === r2.ASTERISK && (n2 = Math.floor(Math.max(0, i2 - (t3 - i2) / 4)), r2._matchRange(n2, i2, 0))) return { start: i2, end: t3 };
              for (i2 += a2[0] + a2[1], e2 = 0; e2 < 4; e2++) a2[e2] = a2[e2 + 2];
              a2[4] = 0, a2[5] = 0, u2--;
            } else u2++;
            a2[u2] = 1, c = !c;
          }
          return null;
        }, r.prototype._decodeExtended = function(t3) {
          for (var e2 = t3.length, n2 = [], r2 = 0; r2 < e2; r2++) {
            var o2 = t3[r2];
            if (o2 >= "a" && o2 <= "d") {
              if (r2 > e2 - 2) return null;
              var i2 = t3[++r2], a2 = i2.charCodeAt(0), u2 = void 0;
              switch (o2) {
                case "a":
                  if (!(i2 >= "A" && i2 <= "Z")) return null;
                  u2 = String.fromCharCode(a2 - 64);
                  break;
                case "b":
                  if (i2 >= "A" && i2 <= "E") u2 = String.fromCharCode(a2 - 38);
                  else if (i2 >= "F" && i2 <= "J") u2 = String.fromCharCode(a2 - 11);
                  else if (i2 >= "K" && i2 <= "O") u2 = String.fromCharCode(a2 + 16);
                  else if (i2 >= "P" && i2 <= "S") u2 = String.fromCharCode(a2 + 43);
                  else {
                    if (!(i2 >= "T" && i2 <= "Z")) return null;
                    u2 = String.fromCharCode(127);
                  }
                  break;
                case "c":
                  if (i2 >= "A" && i2 <= "O") u2 = String.fromCharCode(a2 - 32);
                  else {
                    if ("Z" !== i2) return null;
                    u2 = ":";
                  }
                  break;
                case "d":
                  if (!(i2 >= "A" && i2 <= "Z")) return null;
                  u2 = String.fromCharCode(a2 + 32);
              }
              n2.push(u2);
            } else n2.push(o2);
          }
          return n2;
        }, r.prototype._verifyChecksums = function(t3) {
          return this._matchCheckChar(t3, t3.length - 2, 20) && this._matchCheckChar(t3, t3.length - 1, 15);
        }, r.prototype._matchCheckChar = function(t3, e2, n2) {
          var r2 = this, o2 = t3.slice(0, e2), i2 = o2.length, a2 = o2.reduce(function(t4, e3, o3) {
            return t4 + ((o3 * -1 + (i2 - 1)) % n2 + 1) * r2.ALPHABET.indexOf(e3.charCodeAt(0));
          }, 0);
          return this.ALPHABET[a2 % 47] === t3[e2].charCodeAt(0);
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          o.a.call(this);
        }
        var o = n(4), i = { FORMAT: { value: "ean_2", writeable: false } };
        r.prototype = Object.create(o.a.prototype, i), r.prototype.constructor = r, r.prototype.decode = function(t3, e2) {
          this._row = t3;
          var n2, r2 = 0, o2 = 0, i2 = e2, a = this._row.length, u = [], c = [];
          for (o2 = 0; o2 < 2 && i2 < a; o2++) {
            if (!(n2 = this._decodeCode(i2))) return null;
            c.push(n2), u.push(n2.code % 10), n2.code >= this.CODE_G_START && (r2 |= 1 << 1 - o2), 1 != o2 && (i2 = this._nextSet(this._row, n2.end), i2 = this._nextUnset(this._row, i2));
          }
          return 2 != u.length || parseInt(u.join("")) % 4 !== r2 ? null : { code: u.join(""), decodedCodes: c, end: n2.end };
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r() {
          a.a.call(this);
        }
        function o(t3) {
          var e2;
          for (e2 = 0; e2 < 10; e2++) if (t3 === c[e2]) return e2;
          return null;
        }
        function i(t3) {
          var e2, n2 = t3.length, r2 = 0;
          for (e2 = n2 - 2; e2 >= 0; e2 -= 2) r2 += t3[e2];
          for (r2 *= 3, e2 = n2 - 1; e2 >= 0; e2 -= 2) r2 += t3[e2];
          return (r2 *= 3) % 10;
        }
        var a = n(4), u = { FORMAT: { value: "ean_5", writeable: false } }, c = [24, 20, 18, 17, 12, 6, 3, 10, 9, 5];
        r.prototype = Object.create(a.a.prototype, u), r.prototype.constructor = r, r.prototype.decode = function(t3, e2) {
          this._row = t3;
          var n2, r2 = 0, a2 = 0, u2 = e2, c2 = this._row.length, s = [], f = [];
          for (a2 = 0; a2 < 5 && u2 < c2; a2++) {
            if (!(n2 = this._decodeCode(u2))) return null;
            f.push(n2), s.push(n2.code % 10), n2.code >= this.CODE_G_START && (r2 |= 1 << 4 - a2), 4 != a2 && (u2 = this._nextSet(this._row, n2.end), u2 = this._nextUnset(this._row, u2));
          }
          return 5 != s.length ? null : i(s) !== o(r2) ? null : { code: s.join(""), decodedCodes: f, end: n2.end };
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          o.a.call(this, t3, e2);
        }
        var o = n(4), i = { FORMAT: { value: "ean_8", writeable: false } };
        r.prototype = Object.create(o.a.prototype, i), r.prototype.constructor = r, r.prototype._decodePayload = function(t3, e2, n2) {
          var r2, o2 = this;
          for (r2 = 0; r2 < 4; r2++) {
            if (!(t3 = o2._decodeCode(t3.end, o2.CODE_G_START))) return null;
            e2.push(t3.code), n2.push(t3);
          }
          if (null === (t3 = o2._findPattern(o2.MIDDLE_PATTERN, t3.end, true, false))) return null;
          for (n2.push(t3), r2 = 0; r2 < 4; r2++) {
            if (!(t3 = o2._decodeCode(t3.end, o2.CODE_G_START))) return null;
            n2.push(t3), e2.push(t3.code);
          }
          return t3;
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r(t3) {
          t3 = a()(o(), t3), u.a.call(this, t3), this.barSpaceRatio = [1, 1], t3.normalizeBarSpaceWidth && (this.SINGLE_CODE_ERROR = 0.38, this.AVG_CODE_ERROR = 0.09);
        }
        function o() {
          var t3 = {};
          return Object.keys(r.CONFIG_KEYS).forEach(function(e2) {
            t3[e2] = r.CONFIG_KEYS[e2].default;
          }), t3;
        }
        var i = n(28), a = n.n(i), u = n(1), c = 1, s = 3, f = { START_PATTERN: { value: [c, c, c, c] }, STOP_PATTERN: { value: [c, c, s] }, CODE_PATTERN: { value: [[c, c, s, s, c], [s, c, c, c, s], [c, s, c, c, s], [s, s, c, c, c], [c, c, s, c, s], [s, c, s, c, c], [c, s, s, c, c], [c, c, c, s, s], [s, c, c, s, c], [c, s, c, s, c]] }, SINGLE_CODE_ERROR: { value: 0.78, writable: true }, AVG_CODE_ERROR: { value: 0.38, writable: true }, MAX_CORRECTION_FACTOR: { value: 5 }, FORMAT: { value: "i2of5" } };
        r.prototype = Object.create(u.a.prototype, f), r.prototype.constructor = r, r.prototype._matchPattern = function(t3, e2) {
          if (this.config.normalizeBarSpaceWidth) {
            var n2, r2 = [0, 0], o2 = [0, 0], i2 = [0, 0], a2 = this.MAX_CORRECTION_FACTOR, c2 = 1 / a2;
            for (n2 = 0; n2 < t3.length; n2++) r2[n2 % 2] += t3[n2], o2[n2 % 2] += e2[n2];
            for (i2[0] = o2[0] / r2[0], i2[1] = o2[1] / r2[1], i2[0] = Math.max(Math.min(i2[0], a2), c2), i2[1] = Math.max(Math.min(i2[1], a2), c2), this.barSpaceRatio = i2, n2 = 0; n2 < t3.length; n2++) t3[n2] *= this.barSpaceRatio[n2 % 2];
          }
          return u.a.prototype._matchPattern.call(this, t3, e2);
        }, r.prototype._findPattern = function(t3, e2, n2, r2) {
          var o2, i2, a2, u2, c2 = [], s2 = this, f2 = 0, l = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0 }, d = s2.AVG_CODE_ERROR;
          for (n2 = n2 || false, r2 = r2 || false, e2 || (e2 = s2._nextSet(s2._row)), o2 = 0; o2 < t3.length; o2++) c2[o2] = 0;
          for (o2 = e2; o2 < s2._row.length; o2++) if (s2._row[o2] ^ n2) c2[f2]++;
          else {
            if (f2 === c2.length - 1) {
              for (u2 = 0, a2 = 0; a2 < c2.length; a2++) u2 += c2[a2];
              if ((i2 = s2._matchPattern(c2, t3)) < d) return l.error = i2, l.start = o2 - u2, l.end = o2, l;
              if (!r2) return null;
              for (a2 = 0; a2 < c2.length - 2; a2++) c2[a2] = c2[a2 + 2];
              c2[c2.length - 2] = 0, c2[c2.length - 1] = 0, f2--;
            } else f2++;
            c2[f2] = 1, n2 = !n2;
          }
          return null;
        }, r.prototype._findStart = function() {
          for (var t3, e2, n2 = this, r2 = n2._nextSet(n2._row), o2 = 1; !e2; ) {
            if (!(e2 = n2._findPattern(n2.START_PATTERN, r2, false, true))) return null;
            if (o2 = Math.floor((e2.end - e2.start) / 4), (t3 = e2.start - 10 * o2) >= 0 && n2._matchRange(t3, e2.start, 0)) return e2;
            r2 = e2.end, e2 = null;
          }
        }, r.prototype._verifyTrailingWhitespace = function(t3) {
          var e2, n2 = this;
          return e2 = t3.end + (t3.end - t3.start) / 2, e2 < n2._row.length && n2._matchRange(t3.end, e2, 0) ? t3 : null;
        }, r.prototype._findEnd = function() {
          var t3, e2, n2 = this;
          return n2._row.reverse(), t3 = n2._findPattern(n2.STOP_PATTERN), n2._row.reverse(), null === t3 ? null : (e2 = t3.start, t3.start = n2._row.length - t3.end, t3.end = n2._row.length - e2, null !== t3 ? n2._verifyTrailingWhitespace(t3) : null);
        }, r.prototype._decodePair = function(t3) {
          var e2, n2, r2 = [], o2 = this;
          for (e2 = 0; e2 < t3.length; e2++) {
            if (!(n2 = o2._decodeCode(t3[e2]))) return null;
            r2.push(n2);
          }
          return r2;
        }, r.prototype._decodeCode = function(t3) {
          var e2, n2, r2, o2 = this, i2 = 0, a2 = o2.AVG_CODE_ERROR, u2 = { error: Number.MAX_VALUE, code: -1, start: 0, end: 0 };
          for (e2 = 0; e2 < t3.length; e2++) i2 += t3[e2];
          for (r2 = 0; r2 < o2.CODE_PATTERN.length; r2++) (n2 = o2._matchPattern(t3, o2.CODE_PATTERN[r2])) < u2.error && (u2.code = r2, u2.error = n2);
          if (u2.error < a2) return u2;
        }, r.prototype._decodePayload = function(t3, e2, n2) {
          for (var r2, o2, i2 = this, a2 = 0, u2 = t3.length, c2 = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]; a2 < u2; ) {
            for (r2 = 0; r2 < 5; r2++) c2[0][r2] = t3[a2] * this.barSpaceRatio[0], c2[1][r2] = t3[a2 + 1] * this.barSpaceRatio[1], a2 += 2;
            if (!(o2 = i2._decodePair(c2))) return null;
            for (r2 = 0; r2 < o2.length; r2++) e2.push(o2[r2].code + ""), n2.push(o2[r2]);
          }
          return o2;
        }, r.prototype._verifyCounterLength = function(t3) {
          return t3.length % 10 == 0;
        }, r.prototype._decode = function() {
          var t3, e2, n2, r2 = this, o2 = [], i2 = [];
          return (t3 = r2._findStart()) ? (i2.push(t3), (e2 = r2._findEnd()) ? (n2 = r2._fillCounters(t3.end, e2.start, false), r2._verifyCounterLength(n2) && r2._decodePayload(n2, o2, i2) ? o2.length % 2 != 0 || o2.length < 6 ? null : (i2.push(e2), { code: o2.join(""), start: t3.start, end: e2.end, startInfo: t3, decodedCodes: i2 }) : null) : null) : null;
        }, r.CONFIG_KEYS = { normalizeBarSpaceWidth: { type: "boolean", default: false, description: "If true, the reader tries to normalize thewidth-difference between bars and spaces" } }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          o.a.call(this, t3, e2);
        }
        var o = n(4), i = { CODE_FREQUENCY: { value: [[56, 52, 50, 49, 44, 38, 35, 42, 41, 37], [7, 11, 13, 14, 19, 25, 28, 21, 22, 26]] }, STOP_PATTERN: { value: [1 / 6 * 7, 1 / 6 * 7, 1 / 6 * 7, 1 / 6 * 7, 1 / 6 * 7, 1 / 6 * 7] }, FORMAT: { value: "upc_e", writeable: false } };
        r.prototype = Object.create(o.a.prototype, i), r.prototype.constructor = r, r.prototype._decodePayload = function(t3, e2, n2) {
          var r2, o2 = this, i2 = 0;
          for (r2 = 0; r2 < 6; r2++) {
            if (!(t3 = o2._decodeCode(t3.end))) return null;
            t3.code >= o2.CODE_G_START && (t3.code = t3.code - o2.CODE_G_START, i2 |= 1 << 5 - r2), e2.push(t3.code), n2.push(t3);
          }
          return o2._determineParity(i2, e2) ? t3 : null;
        }, r.prototype._determineParity = function(t3, e2) {
          var n2, r2;
          for (r2 = 0; r2 < this.CODE_FREQUENCY.length; r2++) for (n2 = 0; n2 < this.CODE_FREQUENCY[r2].length; n2++) if (t3 === this.CODE_FREQUENCY[r2][n2]) return e2.unshift(r2), e2.push(n2), true;
          return false;
        }, r.prototype._convertToUPCA = function(t3) {
          var e2 = [t3[0]], n2 = t3[t3.length - 2];
          return e2 = n2 <= 2 ? e2.concat(t3.slice(1, 3)).concat([n2, 0, 0, 0, 0]).concat(t3.slice(3, 6)) : 3 === n2 ? e2.concat(t3.slice(1, 4)).concat([0, 0, 0, 0, 0]).concat(t3.slice(4, 6)) : 4 === n2 ? e2.concat(t3.slice(1, 5)).concat([0, 0, 0, 0, 0, t3[5]]) : e2.concat(t3.slice(1, 6)).concat([0, 0, 0, 0, n2]), e2.push(t3[t3.length - 1]), e2;
        }, r.prototype._checksum = function(t3) {
          return o.a.prototype._checksum.call(this, this._convertToUPCA(t3));
        }, r.prototype._findEnd = function(t3, e2) {
          return e2 = true, o.a.prototype._findEnd.call(this, t3, e2);
        }, r.prototype._verifyTrailingWhitespace = function(t3) {
          var e2, n2 = this;
          if ((e2 = t3.end + (t3.end - t3.start) / 2) < n2._row.length && n2._matchRange(t3.end, e2, 0)) return t3;
        }, e.a = r;
      }, function(t2, e, n) {
        "use strict";
        function r(t3, e2) {
          o.a.call(this, t3, e2);
        }
        var o = n(4), i = { FORMAT: { value: "upc_a", writeable: false } };
        r.prototype = Object.create(o.a.prototype, i), r.prototype.constructor = r, r.prototype._decode = function() {
          var t3 = o.a.prototype._decode.call(this);
          return t3 && t3.code && 13 === t3.code.length && "0" === t3.code.charAt(0) ? (t3.code = t3.code.substring(1), t3) : null;
        }, e.a = r;
      }, function(t2, e) {
        function n(t3, e2) {
          return t3[0] = e2[0], t3[1] = e2[1], t3[2] = e2[2], t3[3] = e2[3], t3;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n() {
          var t3 = new Float32Array(4);
          return t3[0] = 1, t3[1] = 0, t3[2] = 0, t3[3] = 1, t3;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3, e2) {
          var n2 = e2[0], r = e2[1], o = e2[2], i = e2[3], a = n2 * i - o * r;
          return a ? (a = 1 / a, t3[0] = i * a, t3[1] = -r * a, t3[2] = -o * a, t3[3] = n2 * a, t3) : null;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3, e2, n2) {
          return t3[0] = e2[0] * n2, t3[1] = e2[1] * n2, t3;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3, e2, n2) {
          var r = e2[0], o = e2[1];
          return t3[0] = n2[0] * r + n2[2] * o, t3[1] = n2[1] * r + n2[3] * o, t3;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          var e2 = new Float32Array(3);
          return e2[0] = t3[0], e2[1] = t3[1], e2[2] = t3[2], e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = -1, n2 = null == t3 ? 0 : t3.length;
          for (this.clear(); ++e2 < n2; ) {
            var r2 = t3[e2];
            this.set(r2[0], r2[1]);
          }
        }
        var o = n(122), i = n(123), a = n(124), u = n(125), c = n(126);
        r.prototype.clear = o, r.prototype.delete = i, r.prototype.get = a, r.prototype.has = u, r.prototype.set = c, t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = this.__data__ = new o(t3);
          this.size = e2.size;
        }
        var o = n(10), i = n(149), a = n(150), u = n(151), c = n(152), s = n(153);
        r.prototype.clear = i, r.prototype.delete = a, r.prototype.get = u, r.prototype.has = c, r.prototype.set = s, t2.exports = r;
      }, function(t2, e, n) {
        var r = n(5), o = r.Uint8Array;
        t2.exports = o;
      }, function(t2, e) {
        function n(t3, e2, n2) {
          switch (n2.length) {
            case 0:
              return t3.call(e2);
            case 1:
              return t3.call(e2, n2[0]);
            case 2:
              return t3.call(e2, n2[0], n2[1]);
            case 3:
              return t3.call(e2, n2[0], n2[1], n2[2]);
          }
          return t3.apply(e2, n2);
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = a(t3), r2 = !n2 && i(t3), f2 = !n2 && !r2 && u(t3), d = !n2 && !r2 && !f2 && s(t3), h = n2 || r2 || f2 || d, p = h ? o(t3.length, String) : [], v = p.length;
          for (var _ in t3) !e2 && !l.call(t3, _) || h && ("length" == _ || f2 && ("offset" == _ || "parent" == _) || d && ("buffer" == _ || "byteLength" == _ || "byteOffset" == _) || c(_, v)) || p.push(_);
          return p;
        }
        var o = n(107), i = n(18), a = n(2), u = n(44), c = n(15), s = n(45), f = Object.prototype, l = f.hasOwnProperty;
        t2.exports = r;
      }, function(t2, e) {
        function n(t3, e2) {
          for (var n2 = -1, r = null == t3 ? 0 : t3.length, o = Array(r); ++n2 < r; ) o[n2] = e2(t3[n2], n2, t3);
          return o;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3, e2) {
          for (var n2 = -1, r = e2.length, o = t3.length; ++n2 < r; ) t3[o + n2] = e2[n2];
          return t3;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        var r = n(0), o = Object.create, i = /* @__PURE__ */ function() {
          function t3() {
          }
          return function(e2) {
            if (!r(e2)) return {};
            if (o) return o(e2);
            t3.prototype = e2;
            var n2 = new t3();
            return t3.prototype = void 0, n2;
          };
        }();
        t2.exports = i;
      }, function(t2, e, n) {
        function r(t3, e2, n2, a, u) {
          var c = -1, s = t3.length;
          for (n2 || (n2 = i), u || (u = []); ++c < s; ) {
            var f = t3[c];
            e2 > 0 && n2(f) ? e2 > 1 ? r(f, e2 - 1, n2, a, u) : o(u, f) : a || (u[u.length] = f);
          }
          return u;
        }
        var o = n(90), i = n(128);
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(117), o = r();
        t2.exports = o;
      }, function(t2, e, n) {
        function r(t3, e2) {
          e2 = o(e2, t3);
          for (var n2 = 0, r2 = e2.length; null != t3 && n2 < r2; ) t3 = t3[i(e2[n2++])];
          return n2 && n2 == r2 ? t3 : void 0;
        }
        var o = n(13), i = n(23);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3, e2) {
          return null != t3 && e2 in Object(t3);
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return i(t3) && o(t3) == a;
        }
        var o = n(8), i = n(6), a = "[object Arguments]";
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return !(!a(t3) || i(t3)) && (o(t3) ? p : s).test(u(t3));
        }
        var o = n(25), i = n(132), a = n(0), u = n(155), c = /[\\^$.*+?()[\]{}|]/g, s = /^\[object .+?Constructor\]$/, f = Function.prototype, l = Object.prototype, d = f.toString, h = l.hasOwnProperty, p = RegExp("^" + d.call(h).replace(c, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return a(t3) && i(t3.length) && !!u[o(t3)];
        }
        var o = n(8), i = n(26), a = n(6), u = {};
        u["[object Float32Array]"] = u["[object Float64Array]"] = u["[object Int8Array]"] = u["[object Int16Array]"] = u["[object Int32Array]"] = u["[object Uint8Array]"] = u["[object Uint8ClampedArray]"] = u["[object Uint16Array]"] = u["[object Uint32Array]"] = true, u["[object Arguments]"] = u["[object Array]"] = u["[object ArrayBuffer]"] = u["[object Boolean]"] = u["[object DataView]"] = u["[object Date]"] = u["[object Error]"] = u["[object Function]"] = u["[object Map]"] = u["[object Number]"] = u["[object Object]"] = u["[object RegExp]"] = u["[object Set]"] = u["[object String]"] = u["[object WeakMap]"] = false, t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          if (!o(t3)) return a(t3);
          var e2 = i(t3), n2 = [];
          for (var r2 in t3) ("constructor" != r2 || !e2 && c.call(t3, r2)) && n2.push(r2);
          return n2;
        }
        var o = n(0), i = n(40), a = n(144), u = Object.prototype, c = u.hasOwnProperty;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2, f, l) {
          t3 !== e2 && a(e2, function(a2, s2) {
            if (c(a2)) l || (l = new o()), u(t3, e2, s2, n2, r, f, l);
            else {
              var d = f ? f(t3[s2], a2, s2 + "", t3, e2, l) : void 0;
              void 0 === d && (d = a2), i(t3, s2, d);
            }
          }, s);
        }
        var o = n(85), i = n(35), a = n(93), u = n(101), c = n(0), s = n(46);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2, r2, y, m, x) {
          var b = t3[n2], E = e2[n2], C = x.get(E);
          if (C) return void o(t3, n2, C);
          var O = m ? m(b, E, n2 + "", t3, e2, x) : void 0, A = void 0 === O;
          if (A) {
            var R = f(E), w = !R && d(E), T = !R && !w && _(E);
            O = E, R || w || T ? f(b) ? O = b : l(b) ? O = u(b) : w ? (A = false, O = i(E, true)) : T ? (A = false, O = a(E, true)) : O = [] : v(E) || s(E) ? (O = b, s(b) ? O = g(b) : (!p(b) || r2 && h(b)) && (O = c(E))) : A = false;
          }
          A && (x.set(E, O), y(O, E, r2, m, x), x.delete(E)), o(t3, n2, O);
        }
        var o = n(35), i = n(111), a = n(112), u = n(113), c = n(127), s = n(18), f = n(2), l = n(159), d = n(44), h = n(25), p = n(0), v = n(160), _ = n(45), g = n(164);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          return o(t3, e2, function(e3, n2) {
            return i(t3, n2);
          });
        }
        var o = n(103), i = n(158);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          for (var r2 = -1, u = e2.length, c = {}; ++r2 < u; ) {
            var s = e2[r2], f = o(t3, s);
            n2(f, s) && i(c, a(s, t3), f);
          }
          return c;
        }
        var o = n(94), i = n(105), a = n(13);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          return a(i(t3, e2, o), t3 + "");
        }
        var o = n(43), i = n(41), a = n(42);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2, r2) {
          if (!u(t3)) return t3;
          e2 = i(e2, t3);
          for (var s = -1, f = e2.length, l = f - 1, d = t3; null != d && ++s < f; ) {
            var h = c(e2[s]), p = n2;
            if (s != l) {
              var v = d[h];
              p = r2 ? r2(v, h, d) : void 0, void 0 === p && (p = u(v) ? v : a(e2[s + 1]) ? [] : {});
            }
            o(d, h, p), d = d[h];
          }
          return t3;
        }
        var o = n(36), i = n(13), a = n(15), u = n(0), c = n(23);
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(156), o = n(37), i = n(43), a = o ? function(t3, e2) {
          return o(t3, "toString", { configurable: true, enumerable: false, value: r(e2), writable: true });
        } : i;
        t2.exports = a;
      }, function(t2, e) {
        function n(t3, e2) {
          for (var n2 = -1, r = Array(t3); ++n2 < t3; ) r[n2] = e2(n2);
          return r;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          if ("string" == typeof t3) return t3;
          if (a(t3)) return i(t3, r) + "";
          if (u(t3)) return f ? f.call(t3) : "";
          var e2 = t3 + "";
          return "0" == e2 && 1 / t3 == -c ? "-0" : e2;
        }
        var o = n(11), i = n(89), a = n(2), u = n(27), c = 1 / 0, s = o ? o.prototype : void 0, f = s ? s.toString : void 0;
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          return function(e2) {
            return t3(e2);
          };
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = new t3.constructor(t3.byteLength);
          return new o(e2).set(new o(t3)), e2;
        }
        var o = n(86);
        t2.exports = r;
      }, function(t2, e, n) {
        (function(t3) {
          function r(t4, e2) {
            if (e2) return t4.slice();
            var n2 = t4.length, r2 = s ? s(n2) : new t4.constructor(n2);
            return t4.copy(r2), r2;
          }
          var o = n(5), i = "object" == typeof e && e && !e.nodeType && e, a = i && "object" == typeof t3 && t3 && !t3.nodeType && t3, u = a && a.exports === i, c = u ? o.Buffer : void 0, s = c ? c.allocUnsafe : void 0;
          t3.exports = r;
        }).call(e, n(29)(t2));
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = e2 ? o(t3.buffer) : t3.buffer;
          return new t3.constructor(n2, t3.byteOffset, t3.length);
        }
        var o = n(110);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3, e2) {
          var n2 = -1, r = t3.length;
          for (e2 || (e2 = Array(r)); ++n2 < r; ) e2[n2] = t3[n2];
          return e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3, e2, n2, r2) {
          var a = !n2;
          n2 || (n2 = {});
          for (var u = -1, c = e2.length; ++u < c; ) {
            var s = e2[u], f = r2 ? r2(n2[s], t3[s], s, n2, t3) : void 0;
            void 0 === f && (f = t3[s]), a ? i(n2, s, f) : o(n2, s, f);
          }
          return n2;
        }
        var o = n(36), i = n(21);
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(5), o = r["__core-js_shared__"];
        t2.exports = o;
      }, function(t2, e, n) {
        function r(t3) {
          return o(function(e2, n2) {
            var r2 = -1, o2 = n2.length, a = o2 > 1 ? n2[o2 - 1] : void 0, u = o2 > 2 ? n2[2] : void 0;
            for (a = t3.length > 3 && "function" == typeof a ? (o2--, a) : void 0, u && i(n2[0], n2[1], u) && (a = o2 < 3 ? void 0 : a, o2 = 1), e2 = Object(e2); ++r2 < o2; ) {
              var c = n2[r2];
              c && t3(e2, c, r2, a);
            }
            return e2;
          });
        }
        var o = n(104), i = n(129);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          return function(e2, n2, r) {
            for (var o = -1, i = Object(e2), a = r(e2), u = a.length; u--; ) {
              var c = a[t3 ? u : ++o];
              if (n2(i[c], c, i) === false) break;
            }
            return e2;
          };
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return a(i(t3, void 0, o), t3 + "");
        }
        var o = n(157), i = n(41), a = n(42);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = a.call(t3, c), n2 = t3[c];
          try {
            t3[c] = void 0;
            var r2 = true;
          } catch (t4) {
          }
          var o2 = u.call(t3);
          return r2 && (e2 ? t3[c] = n2 : delete t3[c]), o2;
        }
        var o = n(11), i = Object.prototype, a = i.hasOwnProperty, u = i.toString, c = o ? o.toStringTag : void 0;
        t2.exports = r;
      }, function(t2, e) {
        function n(t3, e2) {
          return null == t3 ? void 0 : t3[e2];
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          e2 = o(e2, t3);
          for (var r2 = -1, f = e2.length, l = false; ++r2 < f; ) {
            var d = s(e2[r2]);
            if (!(l = null != t3 && n2(t3, d))) break;
            t3 = t3[d];
          }
          return l || ++r2 != f ? l : !!(f = null == t3 ? 0 : t3.length) && c(f) && u(d, f) && (a(t3) || i(t3));
        }
        var o = n(13), i = n(18), a = n(2), u = n(15), c = n(26), s = n(23);
        t2.exports = r;
      }, function(t2, e, n) {
        function r() {
          this.__data__ = o ? o(null) : {}, this.size = 0;
        }
        var o = n(16);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          var e2 = this.has(t3) && delete this.__data__[t3];
          return this.size -= e2 ? 1 : 0, e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = this.__data__;
          if (o) {
            var n2 = e2[t3];
            return n2 === i ? void 0 : n2;
          }
          return u.call(e2, t3) ? e2[t3] : void 0;
        }
        var o = n(16), i = "__lodash_hash_undefined__", a = Object.prototype, u = a.hasOwnProperty;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = this.__data__;
          return o ? void 0 !== e2[t3] : a.call(e2, t3);
        }
        var o = n(16), i = Object.prototype, a = i.hasOwnProperty;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = this.__data__;
          return this.size += this.has(t3) ? 0 : 1, n2[t3] = o && void 0 === e2 ? i : e2, this;
        }
        var o = n(16), i = "__lodash_hash_undefined__";
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return "function" != typeof t3.constructor || a(t3) ? {} : o(i(t3));
        }
        var o = n(91), i = n(39), a = n(40);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return a(t3) || i(t3) || !!(u && t3 && t3[u]);
        }
        var o = n(11), i = n(18), a = n(2), u = o ? o.isConcatSpreadable : void 0;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2, n2) {
          if (!u(n2)) return false;
          var r2 = typeof e2;
          return !!("number" == r2 ? i(n2) && a(e2, n2.length) : "string" == r2 && e2 in n2) && o(n2[e2], t3);
        }
        var o = n(17), i = n(24), a = n(15), u = n(0);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          if (o(t3)) return false;
          var n2 = typeof t3;
          return !("number" != n2 && "symbol" != n2 && "boolean" != n2 && null != t3 && !i(t3)) || (u.test(t3) || !a.test(t3) || null != e2 && t3 in Object(e2));
        }
        var o = n(2), i = n(27), a = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, u = /^\w*$/;
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          var e2 = typeof t3;
          return "string" == e2 || "number" == e2 || "symbol" == e2 || "boolean" == e2 ? "__proto__" !== t3 : null === t3;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return !!i && i in t3;
        }
        var o = n(115), i = function() {
          var t3 = /[^.]+$/.exec(o && o.keys && o.keys.IE_PROTO || "");
          return t3 ? "Symbol(src)_1." + t3 : "";
        }();
        t2.exports = r;
      }, function(t2, e) {
        function n() {
          this.__data__ = [], this.size = 0;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = this.__data__, n2 = o(e2, t3);
          return !(n2 < 0) && (n2 == e2.length - 1 ? e2.pop() : a.call(e2, n2, 1), --this.size, true);
        }
        var o = n(12), i = Array.prototype, a = i.splice;
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = this.__data__, n2 = o(e2, t3);
          return n2 < 0 ? void 0 : e2[n2][1];
        }
        var o = n(12);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return o(this.__data__, t3) > -1;
        }
        var o = n(12);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = this.__data__, r2 = o(n2, t3);
          return r2 < 0 ? (++this.size, n2.push([t3, e2])) : n2[r2][1] = e2, this;
        }
        var o = n(12);
        t2.exports = r;
      }, function(t2, e, n) {
        function r() {
          this.size = 0, this.__data__ = { hash: new o(), map: new (a || i)(), string: new o() };
        }
        var o = n(84), i = n(10), a = n(33);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = o(this, t3).delete(t3);
          return this.size -= e2 ? 1 : 0, e2;
        }
        var o = n(14);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return o(this, t3).get(t3);
        }
        var o = n(14);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return o(this, t3).has(t3);
        }
        var o = n(14);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = o(this, t3), r2 = n2.size;
          return n2.set(t3, e2), this.size += n2.size == r2 ? 0 : 1, this;
        }
        var o = n(14);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          var e2 = o(t3, function(t4) {
            return n2.size === i && n2.clear(), t4;
          }), n2 = e2.cache;
          return e2;
        }
        var o = n(161), i = 500;
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          var e2 = [];
          if (null != t3) for (var n2 in Object(t3)) e2.push(n2);
          return e2;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        (function(t3) {
          var r = n(38), o = "object" == typeof e && e && !e.nodeType && e, i = o && "object" == typeof t3 && t3 && !t3.nodeType && t3, a = i && i.exports === o, u = a && r.process, c = function() {
            try {
              return u && u.binding && u.binding("util");
            } catch (t4) {
            }
          }();
          t3.exports = c;
        }).call(e, n(29)(t2));
      }, function(t2, e) {
        function n(t3) {
          return o.call(t3);
        }
        var r = Object.prototype, o = r.toString;
        t2.exports = n;
      }, function(t2, e) {
        function n(t3, e2) {
          return function(n2) {
            return t3(e2(n2));
          };
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          var e2 = 0, n2 = 0;
          return function() {
            var a = i(), u = o - (a - n2);
            if (n2 = a, u > 0) {
              if (++e2 >= r) return arguments[0];
            } else e2 = 0;
            return t3.apply(void 0, arguments);
          };
        }
        var r = 800, o = 16, i = Date.now;
        t2.exports = n;
      }, function(t2, e, n) {
        function r() {
          this.__data__ = new o(), this.size = 0;
        }
        var o = n(10);
        t2.exports = r;
      }, function(t2, e) {
        function n(t3) {
          var e2 = this.__data__, n2 = e2.delete(t3);
          return this.size = e2.size, n2;
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          return this.__data__.get(t3);
        }
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          return this.__data__.has(t3);
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3, e2) {
          var n2 = this.__data__;
          if (n2 instanceof o) {
            var r2 = n2.__data__;
            if (!i || r2.length < u - 1) return r2.push([t3, e2]), this.size = ++n2.size, this;
            n2 = this.__data__ = new a(r2);
          }
          return n2.set(t3, e2), this.size = n2.size, this;
        }
        var o = n(10), i = n(33), a = n(34), u = 200;
        t2.exports = r;
      }, function(t2, e, n) {
        var r = n(143), o = /^\./, i = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, a = /\\(\\)?/g, u = r(function(t3) {
          var e2 = [];
          return o.test(t3) && e2.push(""), t3.replace(i, function(t4, n2, r2, o2) {
            e2.push(r2 ? o2.replace(a, "$1") : n2 || t4);
          }), e2;
        });
        t2.exports = u;
      }, function(t2, e) {
        function n(t3) {
          if (null != t3) {
            try {
              return o.call(t3);
            } catch (t4) {
            }
            try {
              return t3 + "";
            } catch (t4) {
            }
          }
          return "";
        }
        var r = Function.prototype, o = r.toString;
        t2.exports = n;
      }, function(t2, e) {
        function n(t3) {
          return function() {
            return t3;
          };
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return (null == t3 ? 0 : t3.length) ? o(t3, 1) : [];
        }
        var o = n(92);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          return null != t3 && i(t3, e2, o);
        }
        var o = n(95), i = n(121);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return i(t3) && o(t3);
        }
        var o = n(24), i = n(6);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          if (!a(t3) || o(t3) != u) return false;
          var e2 = i(t3);
          if (null === e2) return true;
          var n2 = l.call(e2, "constructor") && e2.constructor;
          return "function" == typeof n2 && n2 instanceof n2 && f.call(n2) == d;
        }
        var o = n(8), i = n(39), a = n(6), u = "[object Object]", c = Function.prototype, s = Object.prototype, f = c.toString, l = s.hasOwnProperty, d = f.call(Object);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3, e2) {
          if ("function" != typeof t3 || null != e2 && "function" != typeof e2) throw new TypeError(i);
          var n2 = function() {
            var r2 = arguments, o2 = e2 ? e2.apply(this, r2) : r2[0], i2 = n2.cache;
            if (i2.has(o2)) return i2.get(o2);
            var a = t3.apply(this, r2);
            return n2.cache = i2.set(o2, a) || i2, a;
          };
          return n2.cache = new (r.Cache || o)(), n2;
        }
        var o = n(34), i = "Expected a function";
        r.Cache = o, t2.exports = r;
      }, function(t2, e, n) {
        var r = n(102), o = n(118), i = o(function(t3, e2) {
          return null == t3 ? {} : r(t3, e2);
        });
        t2.exports = i;
      }, function(t2, e) {
        function n() {
          return false;
        }
        t2.exports = n;
      }, function(t2, e, n) {
        function r(t3) {
          return o(t3, i(t3));
        }
        var o = n(114), i = n(46);
        t2.exports = r;
      }, function(t2, e, n) {
        function r(t3) {
          return null == t3 ? "" : o(t3);
        }
        var o = n(108);
        t2.exports = r;
      }, function(t2, e, n) {
        t2.exports = n(48);
      }]);
    });
  }
});
export default require_quagga_min();
//# sourceMappingURL=quagga.js.map
