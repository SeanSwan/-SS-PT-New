import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addSeconds,
  addWeeks,
  addYears,
  en_US_default,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDate,
  getDaysInMonth,
  getHours,
  getMilliseconds,
  getMinutes,
  getMonth,
  getSeconds,
  getWeek,
  getYear,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isSameHour,
  isSameMonth,
  isSameYear,
  isValid,
  isWithinInterval,
  parse,
  setDate,
  setHours,
  setMilliseconds,
  setMinutes,
  setMonth,
  setSeconds,
  setYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from "./chunk-DIMQMN7P.js";
import "./chunk-ZBE2Y43W.js";
import "./chunk-VPI4FCPN.js";
import {
  _extends
} from "./chunk-HQ6ZTAWL.js";
import {
  __commonJS,
  __toESM
} from "./chunk-OL46QLBJ.js";

// node_modules/date-fns/_lib/format/longFormatters/index.js
var require_longFormatters = __commonJS({
  "node_modules/date-fns/_lib/format/longFormatters/index.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var dateLongFormatter = function dateLongFormatter2(pattern, formatLong) {
      switch (pattern) {
        case "P":
          return formatLong.date({
            width: "short"
          });
        case "PP":
          return formatLong.date({
            width: "medium"
          });
        case "PPP":
          return formatLong.date({
            width: "long"
          });
        case "PPPP":
        default:
          return formatLong.date({
            width: "full"
          });
      }
    };
    var timeLongFormatter = function timeLongFormatter2(pattern, formatLong) {
      switch (pattern) {
        case "p":
          return formatLong.time({
            width: "short"
          });
        case "pp":
          return formatLong.time({
            width: "medium"
          });
        case "ppp":
          return formatLong.time({
            width: "long"
          });
        case "pppp":
        default:
          return formatLong.time({
            width: "full"
          });
      }
    };
    var dateTimeLongFormatter = function dateTimeLongFormatter2(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/) || [];
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];
      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }
      var dateTimeFormat;
      switch (datePattern) {
        case "P":
          dateTimeFormat = formatLong.dateTime({
            width: "short"
          });
          break;
        case "PP":
          dateTimeFormat = formatLong.dateTime({
            width: "medium"
          });
          break;
        case "PPP":
          dateTimeFormat = formatLong.dateTime({
            width: "long"
          });
          break;
        case "PPPP":
        default:
          dateTimeFormat = formatLong.dateTime({
            width: "full"
          });
          break;
      }
      return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong)).replace("{{time}}", timeLongFormatter(timePattern, formatLong));
    };
    var longFormatters2 = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };
    var _default = longFormatters2;
    exports.default = _default;
    module.exports = exports.default;
  }
});

// node_modules/@mui/x-date-pickers/AdapterDateFns/AdapterDateFns.js
var import_longFormatters = __toESM(require_longFormatters());

// node_modules/@mui/x-date-pickers/AdapterDateFnsBase/AdapterDateFnsBase.js
var formatTokenMap = {
  // Year
  y: {
    sectionType: "year",
    contentType: "digit",
    maxLength: 4
  },
  yy: "year",
  yyy: {
    sectionType: "year",
    contentType: "digit",
    maxLength: 4
  },
  yyyy: "year",
  // Month
  M: {
    sectionType: "month",
    contentType: "digit",
    maxLength: 2
  },
  MM: "month",
  MMMM: {
    sectionType: "month",
    contentType: "letter"
  },
  MMM: {
    sectionType: "month",
    contentType: "letter"
  },
  L: {
    sectionType: "month",
    contentType: "digit",
    maxLength: 2
  },
  LL: "month",
  LLL: {
    sectionType: "month",
    contentType: "letter"
  },
  LLLL: {
    sectionType: "month",
    contentType: "letter"
  },
  // Day of the month
  d: {
    sectionType: "day",
    contentType: "digit",
    maxLength: 2
  },
  dd: "day",
  do: {
    sectionType: "day",
    contentType: "digit-with-letter"
  },
  // Day of the week
  E: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  EE: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  EEE: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  EEEE: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  EEEEE: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  i: {
    sectionType: "weekDay",
    contentType: "digit",
    maxLength: 1
  },
  ii: "weekDay",
  iii: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  iiii: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  // eslint-disable-next-line id-denylist
  e: {
    sectionType: "weekDay",
    contentType: "digit",
    maxLength: 1
  },
  ee: "weekDay",
  eee: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  eeee: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  eeeee: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  eeeeee: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  c: {
    sectionType: "weekDay",
    contentType: "digit",
    maxLength: 1
  },
  cc: "weekDay",
  ccc: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  cccc: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  ccccc: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  cccccc: {
    sectionType: "weekDay",
    contentType: "letter"
  },
  // Meridiem
  a: "meridiem",
  aa: "meridiem",
  aaa: "meridiem",
  // Hours
  H: {
    sectionType: "hours",
    contentType: "digit",
    maxLength: 2
  },
  HH: "hours",
  h: {
    sectionType: "hours",
    contentType: "digit",
    maxLength: 2
  },
  hh: "hours",
  // Minutes
  m: {
    sectionType: "minutes",
    contentType: "digit",
    maxLength: 2
  },
  mm: "minutes",
  // Seconds
  s: {
    sectionType: "seconds",
    contentType: "digit",
    maxLength: 2
  },
  ss: "seconds"
};
var defaultFormats = {
  year: "yyyy",
  month: "LLLL",
  monthShort: "MMM",
  dayOfMonth: "d",
  dayOfMonthFull: "do",
  weekday: "EEEE",
  weekdayShort: "EEEEEE",
  hours24h: "HH",
  hours12h: "hh",
  meridiem: "aa",
  minutes: "mm",
  seconds: "ss",
  fullDate: "PP",
  keyboardDate: "P",
  shortDate: "MMM d",
  normalDate: "d MMMM",
  normalDateWithWeekday: "EEE, MMM d",
  fullTime: "p",
  fullTime12h: "hh:mm aa",
  fullTime24h: "HH:mm",
  keyboardDateTime: "P p",
  keyboardDateTime12h: "P hh:mm aa",
  keyboardDateTime24h: "P HH:mm"
};
var AdapterDateFnsBase = class {
  constructor(props) {
    this.isMUIAdapter = true;
    this.isTimezoneCompatible = false;
    this.lib = void 0;
    this.locale = void 0;
    this.formats = void 0;
    this.formatTokenMap = formatTokenMap;
    this.escapedCharacters = {
      start: "'",
      end: "'"
    };
    this.longFormatters = void 0;
    this.date = (value) => {
      if (typeof value === "undefined") {
        return /* @__PURE__ */ new Date();
      }
      if (value === null) {
        return null;
      }
      return new Date(value);
    };
    this.getInvalidDate = () => /* @__PURE__ */ new Date("Invalid Date");
    this.getTimezone = () => {
      return "default";
    };
    this.setTimezone = (value) => {
      return value;
    };
    this.toJsDate = (value) => {
      return value;
    };
    this.getCurrentLocaleCode = () => {
      return this.locale.code;
    };
    this.is12HourCycleInCurrentLocale = () => {
      return /a/.test(this.locale.formatLong.time({
        width: "short"
      }));
    };
    this.expandFormat = (format2) => {
      const longFormatRegexp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
      return format2.match(longFormatRegexp).map((token) => {
        const firstCharacter = token[0];
        if (firstCharacter === "p" || firstCharacter === "P") {
          const longFormatter = this.longFormatters[firstCharacter];
          return longFormatter(token, this.locale.formatLong);
        }
        return token;
      }).join("");
    };
    this.formatNumber = (numberToFormat) => {
      return numberToFormat;
    };
    this.getDayOfWeek = (value) => {
      return value.getDay() + 1;
    };
    const {
      locale,
      formats,
      longFormatters: longFormatters2,
      lib
    } = props;
    this.locale = locale;
    this.formats = _extends({}, defaultFormats, formats);
    this.longFormatters = longFormatters2;
    this.lib = lib || "date-fns";
  }
};

// node_modules/@mui/x-date-pickers/AdapterDateFns/AdapterDateFns.js
var AdapterDateFns = class extends AdapterDateFnsBase {
  constructor({
    locale,
    formats
  } = {}) {
    if (true) {
      if (typeof addDays !== "function") {
        throw new Error(["MUI: This adapter is only compatible with `date-fns` v2.x package versions.", "Please, install v2.x of the package or use the `AdapterDateFnsV3` instead."].join("\n"));
      }
    }
    super({
      locale: locale ?? en_US_default,
      formats,
      longFormatters: import_longFormatters.default
    });
    this.parse = (value, format2) => {
      if (value === "") {
        return null;
      }
      return parse(value, format2, /* @__PURE__ */ new Date(), {
        locale: this.locale
      });
    };
    this.isValid = (value) => {
      if (value == null) {
        return false;
      }
      return isValid(value);
    };
    this.format = (value, formatKey) => {
      return this.formatByString(value, this.formats[formatKey]);
    };
    this.formatByString = (value, formatString) => {
      return format(value, formatString, {
        locale: this.locale
      });
    };
    this.isEqual = (value, comparing) => {
      if (value === null && comparing === null) {
        return true;
      }
      if (value === null || comparing === null) {
        return false;
      }
      return isEqual(value, comparing);
    };
    this.isSameYear = (value, comparing) => {
      return isSameYear(value, comparing);
    };
    this.isSameMonth = (value, comparing) => {
      return isSameMonth(value, comparing);
    };
    this.isSameDay = (value, comparing) => {
      return isSameDay(value, comparing);
    };
    this.isSameHour = (value, comparing) => {
      return isSameHour(value, comparing);
    };
    this.isAfter = (value, comparing) => {
      return isAfter(value, comparing);
    };
    this.isAfterYear = (value, comparing) => {
      return isAfter(value, endOfYear(comparing));
    };
    this.isAfterDay = (value, comparing) => {
      return isAfter(value, endOfDay(comparing));
    };
    this.isBefore = (value, comparing) => {
      return isBefore(value, comparing);
    };
    this.isBeforeYear = (value, comparing) => {
      return isBefore(value, this.startOfYear(comparing));
    };
    this.isBeforeDay = (value, comparing) => {
      return isBefore(value, this.startOfDay(comparing));
    };
    this.isWithinRange = (value, [start, end]) => {
      return isWithinInterval(value, {
        start,
        end
      });
    };
    this.startOfYear = (value) => {
      return startOfYear(value);
    };
    this.startOfMonth = (value) => {
      return startOfMonth(value);
    };
    this.startOfWeek = (value) => {
      return startOfWeek(value, {
        locale: this.locale
      });
    };
    this.startOfDay = (value) => {
      return startOfDay(value);
    };
    this.endOfYear = (value) => {
      return endOfYear(value);
    };
    this.endOfMonth = (value) => {
      return endOfMonth(value);
    };
    this.endOfWeek = (value) => {
      return endOfWeek(value, {
        locale: this.locale
      });
    };
    this.endOfDay = (value) => {
      return endOfDay(value);
    };
    this.addYears = (value, amount) => {
      return addYears(value, amount);
    };
    this.addMonths = (value, amount) => {
      return addMonths(value, amount);
    };
    this.addWeeks = (value, amount) => {
      return addWeeks(value, amount);
    };
    this.addDays = (value, amount) => {
      return addDays(value, amount);
    };
    this.addHours = (value, amount) => {
      return addHours(value, amount);
    };
    this.addMinutes = (value, amount) => {
      return addMinutes(value, amount);
    };
    this.addSeconds = (value, amount) => {
      return addSeconds(value, amount);
    };
    this.getYear = (value) => {
      return getYear(value);
    };
    this.getMonth = (value) => {
      return getMonth(value);
    };
    this.getDate = (value) => {
      return getDate(value);
    };
    this.getHours = (value) => {
      return getHours(value);
    };
    this.getMinutes = (value) => {
      return getMinutes(value);
    };
    this.getSeconds = (value) => {
      return getSeconds(value);
    };
    this.getMilliseconds = (value) => {
      return getMilliseconds(value);
    };
    this.setYear = (value, year) => {
      return setYear(value, year);
    };
    this.setMonth = (value, month) => {
      return setMonth(value, month);
    };
    this.setDate = (value, date) => {
      return setDate(value, date);
    };
    this.setHours = (value, hours) => {
      return setHours(value, hours);
    };
    this.setMinutes = (value, minutes) => {
      return setMinutes(value, minutes);
    };
    this.setSeconds = (value, seconds) => {
      return setSeconds(value, seconds);
    };
    this.setMilliseconds = (value, milliseconds) => {
      return setMilliseconds(value, milliseconds);
    };
    this.getDaysInMonth = (value) => {
      return getDaysInMonth(value);
    };
    this.getWeekArray = (value) => {
      const start = this.startOfWeek(this.startOfMonth(value));
      const end = this.endOfWeek(this.endOfMonth(value));
      let count = 0;
      let current = start;
      const nestedWeeks = [];
      while (this.isBefore(current, end)) {
        const weekNumber = Math.floor(count / 7);
        nestedWeeks[weekNumber] = nestedWeeks[weekNumber] || [];
        nestedWeeks[weekNumber].push(current);
        current = this.addDays(current, 1);
        count += 1;
      }
      return nestedWeeks;
    };
    this.getWeekNumber = (value) => {
      return getWeek(value, {
        locale: this.locale
      });
    };
    this.getYearRange = ([start, end]) => {
      const startDate = this.startOfYear(start);
      const endDate = this.endOfYear(end);
      const years = [];
      let current = startDate;
      while (this.isBefore(current, endDate)) {
        years.push(current);
        current = this.addYears(current, 1);
      }
      return years;
    };
  }
};
export {
  AdapterDateFns
};
//# sourceMappingURL=@mui_x-date-pickers_AdapterDateFns.js.map
