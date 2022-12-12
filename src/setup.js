
class Animate {

    static MONTH_TIMEOUT = [];
    static ARROW_TIMEOUT = null;

    static month(delta) {
        if (Elements.MONTH_TITLE.animating) {
            // Cancel old timeouts
            clearTimeout(this.MONTH_TIMEOUT[0]);
            clearTimeout(this.MONTH_TIMEOUT[1]);

            // Add new title and update references
            Elements.MONTH_TITLE = WINDOW.reAddMonthTitle(this.MONTH_TIMEOUT[2]);
        }

        let dirmode = delta < 0 ? "moveup" : "movedown";
        Elements.MONTH_TITLE.classList.toggle(dirmode);
        Elements.MONTH_TITLE.animating = true;
        this.MONTH_TIMEOUT[2] = WINDOW.calandar.getMonth();

        // Set timeouts for animation
        this.MONTH_TIMEOUT[0] = setTimeout(function () {
            Elements.MONTH_TITLE.innerHTML = WINDOW.calandar.getMonth();
        }, 1000 * 0.2);
        this.MONTH_TIMEOUT[1] = setTimeout(function () {
            Elements.MONTH_TITLE.classList.remove(dirmode);
            Elements.MONTH_TITLE.animating = false;
        }, 1000 * 0.4);
    }

    static monthArrow(delta) {
        let elem = delta < 0 ? Elements.MONTH_LEFT : Elements.MONTH_RIGHT;

        if (elem.animating) {
            // Create new element
            let HTML = "";
            if (delta < 0) HTML = `<button id="month-left" class="arrow" onclick="WINDOW.calandar.changeMonth(-1)">◄</button>`;
            else HTML = `<button id="month-right" class="arrow" onclick="WINDOW.calandar.changeMonth(+1)">►</button>`;
            let newElem = createElementFromHTML(HTML);

            // Replace the old one
            let children = Elements.MONTH_DIV.children;
            let child = (delta < 0) ? (0) : (2);
            children[child].replaceWith(newElem);
            if (delta < 0) Elements.MONTH_LEFT = newElem;
            else Elements.MONTH_RIGHT = newElem;
        }

        elem.classList.toggle("flash");
        elem.animating = true;

        this.ARROW_TIMEOUT = setTimeout(function () {
            elem.classList.remove("flash");
            elem.animating = false;
        }, 1000 * 0.2);
    }
}

class Elements {
    static MONTH_DIV = document.getElementById("month-div");
    static MONTH_TITLE = document.getElementById("month-title");
    static MONTH_LEFT = document.getElementById("month-left");
    static MONTH_RIGHT = document.getElementById("month-right");
    static DAYS = document.getElementById("days");
    static DAY_ITEMS = Array(37);

    static setup() {
        // Create calandar elements
        this.initCalandar();

        // Set action listeners
        for (let i=0; i<this.DAY_ITEMS.length; i++) {
            let child = this.DAY_ITEMS[i];
            child.onclick = (e) => PTOCalculator.selectDate(i, e, "left");
            child.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                PTOCalculator.selectDate(i, e, "right");
            });
        }
    }

    static initCalandar() {
        outerloop:
        for (let i=0; i<6; i++) {
            let tr = document.createElement("tr");
            for (let j=0; j<7; j++) {
                let day = document.createElement("th");
                let date = document.createElement("div");
                let pto = document.createElement("h2");
                let index = i * 7 + j;
                if (index == 37) break outerloop;

                date.innerHTML = index + 1;
                pto.innerHTML = 0;

                date.classList.add("date");
                day.appendChild(date);
                day.appendChild(pto);
                tr.appendChild(day);
                this.DAY_ITEMS[index] = day;
            }
            this.DAYS.appendChild(tr);
        }
    }
}

class PTOCalculator {
    // static PAYROLL = "bi-weekly";
    static PAYROLL = "semi-monthly";
    static MAX_PTO = 120; // hours
    static HOURS_ACCRUED = 9;
    static DEFAULT_TIME_OFF = 8;

    static selectDate(index, event, button) {
        // console.log(index, event, button);

        // Get the day
        let month = WINDOW.calandar.getCurrentMonth();
        let dayIndex = index - month.startWeekday;
        let day = month.days[dayIndex];

        // Update the day
        if (day.timeOff == 0) {
            day.timeOff = this.DEFAULT_TIME_OFF;
        } else {
            day.timeOff = 0;
        }

        // Update day attributes
        day.updateAttributes();

        // Recalc pto for the year
        WINDOW.recalcPTO();

        // Redraw backgrounds
        month.calcDisplayPTO(dayIndex);
    }

    constructor() {
        if (this.constructor == PTOCalculator)
            throw new Error("Object of Abstract Class cannot be created");
        this.startPTO = 0;
        this.endPTO = 0;
    }

    calcPTO(initPTO) {
        throw new Error("Abstract Method has no implementation");
    }

    calcDisplayPTO() {
        throw new Error("Abstract Method has no implementation");
    }
}

class Year extends PTOCalculator {
    constructor(year) {
        super();
        this.year = year;
        this.months = Array(12);

        // Init months
        let weekday = 0;
        for (let i = 0; i < this.months.length; i++) {
            let month = this.months[i] = new Month(i, this);
            month.startWeekday = weekday;

            // Set weekdays
            for (let j = 0; j < month.days.length; j++) {
                let day = month.days[j];
                day.weekday = weekday;

                // Increment weekday
                weekday = (weekday + 1) % 7;
            }
        }
    }

    selectMonth(month) {
        this.months[month].select();
    }

    calcPTO(initPTO = 0) {
        this.startPTO = initPTO;
        this.endPTO = this.startPTO;
        for (let i in this.months) {
            let month = this.months[i];
            month.calcPTO(this.endPTO);

            // Update end PTO
            this.endPTO = month.endPTO;
        }

        return this.endPTO;
    }
}

class Month extends PTOCalculator {

    static MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    constructor(month, year) {
        super();
        this.month = month;
        this.year = year;

        // Get number of days
        this.days = Array(Month.MONTH_DAYS[month]);

        // Init days
        for (let i = 0; i < this.days.length; i++) {
            this.days[i] = new Day(i, this, year);
        }

    }

    select() {
        // Enable months
        for (let i = 0; i < 37; i++) {
            let elem = Elements.DAY_ITEMS[i];
            elem.style.visibility = "hidden";
        }

        // Disable months
        for (let i = this.startWeekday, day = 0; i < this.startWeekday + this.days.length; i++, day++) {
            let elem = Elements.DAY_ITEMS[i];
            elem.style.visibility = "visible";

            // Update day
            this.days[day].update(i);

        }

        // Recalculate pto imagery
        // ...
        this.calcDisplayPTO();

    }

    calcPTO(initPTO) {
        this.startPTO = initPTO;
        this.endPTO = this.startPTO;
        for (let i=0; i<this.days.length; i++) {
            let day = this.days[i];
            day.calcPTO(this.endPTO);

            // Update end PTO
            this.endPTO = day.endPTO;
        }
    }

    async calcDisplayPTO(start = 0) {
        for (let i=start; i<this.days.length; i++) {
            await this.days[i].calcDisplayPTO();
        }
    }
}

class Day extends PTOCalculator {
    constructor(day, month, year) {
        super();
        
        // About
        this.day = day;
        this.month = month;
        this.year = year;
        this.weekday = 0;

        // Background Display
        this.imgsrc = "";
        this.elem = null;
        this.current = false;
        this.lastDisplayPTO = null;

        // PTO
        this.timeOff = 0;
        this.payDay = false;

    }

    update(elemIndex) {
        this.elem = Elements.DAY_ITEMS[elemIndex];
        this.setElem().date();
        this.setElem().pto();
    }

    setCurrent(state = true) {
        this.current = state;
        this.setElem().date();
    }

    setElem() {
        const THIS = this;

        function date() {
            let str = THIS.day + 1;
            let date = THIS.elem.getElementsByTagName("div")[0];

            if (THIS.current) date.classList.add("active");
            else date.classList.remove("active");
            date.innerHTML = str;
            
            // Update outline attributes
            THIS.updateAttributes();

            // Update the background image
            THIS.updateImage();
        }

        function pto() {
            if (THIS.elem == null) return;
            let header = THIS.elem.getElementsByTagName("h2")[0];
            header.innerHTML = THIS.endPTO;
        }

        return { date, pto };
    }

    updateImage(src = this.imgsrc) {
        this.imgsrc = src;
        // Set element background
        this.elem.style.backgroundImage = "url(" + src + ")";
    }

    updateAttributes() {
        // Update outline on paydays
        if (this.timeOff > 0) {
            this.elem.classList.remove("payday");
            this.elem.classList.add("timeoff");
        } else if (this.payDay) {
            this.elem.classList.remove("timeoff");
            this.elem.classList.add("payday");
        } else {
            this.elem.classList.remove("payday");
            this.elem.classList.remove("timeoff");
        }
    }

    calcPTO(initPTO) {
        this.startPTO = initPTO;
        this.endPTO = this.startPTO;

        if (PTOCalculator.PAYROLL == "bi-weekly") {
            // Every other friday
            let day = this.day + this.month.startWeekday;
            this.payDay = day % 14 == 11;
        } else if (PTOCalculator.PAYROLL == "semi-monthly") {
            let payDay = 15;
            let monthDays = this.month.days.length;
            let payDay2 = Math.min(monthDays, payDay + 15);
            if (payDay2 < monthDays) payDay2 = monthDays - 2;
            this.payDay = (this.day == payDay - 1 || this.day == payDay2 - 1)
        }

        // Add different to result pto
        if (this.payDay) this.endPTO += PTOCalculator.HOURS_ACCRUED;
        this.endPTO -= this.timeOff;

        // Only if on this month set new pto
        if (WINDOW.calandar.currentMonth == this.month.month)
            this.setElem().pto();

    }

    async calcDisplayPTO() {
        // Stop if not on this month
        if (WINDOW.calandar.currentMonth != this.month.month)
            return;

        // Update image
        if (this.endPTO != this.lastDisplayPTO) {
            this.lastDisplayPTO = this.endPTO;
            WINDOW.pto.updateDay(this);
            this.updateImage();
            return await sleep(20);
        }

        // Set the background image
        this.updateImage();
    }
}

class Calandar {
    constructor(window) {
        this.window = window;

        // Set the current month
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.currentDay = new Date().getDate() - 1;

        // Create years and set year
        this.years = {};

    }

    changeMonth(delta, animate = true) {

        // if (Elements.MONTH_TITLE.animating) return;

        // Adjust date
        let newMonth = this.currentMonth + delta;
        let yearDelta = Math.floor(newMonth / 12);
        let request = true;

        // Create a new year
        if (this.years[this.currentYear + yearDelta] == null) {
            request = this.addNewYear(this.currentYear + yearDelta);
        }

        if (!request) return;

        this.currentMonth += delta;
        this.currentYear += yearDelta;
        this.currentMonth -= yearDelta * 12;

        // Select new month
        this.years[this.currentYear].selectMonth(this.currentMonth);

        if (!animate) {
            Elements.MONTH_TITLE.innerHTML = this.getMonth();
            return;
        }

        // Animating arrow
        Animate.monthArrow(delta);

        // Animating month title
        Animate.month(delta);

    }

    getMonth() {
        let str = Window.MONTH_NAMES[this.currentMonth] + " " + this.currentYear;
        if (this.isCurrentMonth())
            str = `<span class="active">${str}</span>`;
        return str;
    }

    getCurrentYear() {
        return this.years[this.currentYear];
    }

    getCurrentMonth() {
        return this.getCurrentYear().months[this.currentMonth];
    }

    getCurrentDay() {
        return this.getCurrentMonth().days[this.currentDay];
    }

    isCurrentMonth() {
        return this.currentMonth == new Date().getMonth() &&
            this.currentYear == new Date().getFullYear();
    }

    selectCurrentMonth() {
        this.years[this.currentYear].selectMonth(this.currentMonth);
    }

    addNewYear(yearNum, noprompt = false) {
        if (!noprompt) {
            // Confirm new year
            const response = confirm("Are you sure you want to create a new year?");        
            if (!response) return false;
        }

        let year = this.years[yearNum] = new Year(yearNum);

        // Recalculate pto
        WINDOW.recalcPTO();

        return true;
    }
}

class Window {

    static MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    constructor() {
        // Create new calandar
        this.calandar = new Calandar(this);

        // Set month title
        Elements.MONTH_TITLE.innerHTML = this.calandar.getMonth();

        this.initPTO();
        this.initEvents();
    }

    initPTO() {
        this.pto = new DisplayPTO(this);
    }

    initEvents() {
        
    }

    reAddMonthTitle(oldMonth = "Year") {
        // Create new title
        let title = document.createElement("span");
        title.setAttribute("id", "month-title");
        title.innerHTML = oldMonth;
        Elements.MONTH_TITLE = title;

        // Replace the old title
        let children = Elements.MONTH_DIV.children;
        children[1].replaceWith(title);

        // Return the new title
        return title;
    }

    recalcPTO() {
        let years = [];

        // Create array of years
        for (let key in WINDOW.calandar.years)
            years.push(parseInt(key));

        // Sort them (starting at lowest)
        years.sort();

        // Calculate all PTO
        let pto = 0;
        for (let i of years) {
            pto = this.calandar.years[i].calcPTO(pto);
        }
    }

}

class DisplayPTO {
    constructor(window) {
        this.window = window;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.canvas.width = 200;
        this.canvas.height = 200;

        this.goodColor = hexToRgb("#1cffd255");
        this.badColor = hexToRgb("#bc1a4b66");

        // Create gradient fill
        this.fillStyle = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        // this.fillStyle.addColorStop(0, "#1abc9c44");
        // this.fillStyle.addColorStop(1, "#1cffd255");
        // this.fillStyle.addColorStop(0, "#bc1a4b66");
        // this.fillStyle.addColorStop(1, "#1cffd255");

        // this.updateDay(this.window.getCurrentDay());

    }

    updateDay(day) {
        let ptoRatio = day.endPTO / PTOCalculator.MAX_PTO;
        ptoRatio = Math.max(Math.min(ptoRatio, 1), 0);

        // Get references
        let canvas = this.canvas;
        let ctx = this.context;

        // Draw PTO chart
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = this.createGradient(ptoRatio);
        ctx.fillRect(0, canvas.height, canvas.width, Math.floor(-canvas.height * ptoRatio));

        // Get url data
        let url = canvas.toDataURL();
        day.imgsrc = url;
    }

    createGradient(ratio) {
        let grad = this.context.createLinearGradient(0, 0, 0, this.canvas.height);

        // 0: good to good
        // 0.5: good to bad
        // 1: bad to bad

        let c1 = this.badColor;
        let c2 = lerpColor(this.goodColor, this.badColor, ratio / 2);
        grad.addColorStop(0, "rgb("+c1.r+","+c1.g+","+c1.b+","+c1.a/255+")");
        grad.addColorStop(1, "rgb("+c2.r+","+c2.g+","+c2.b+","+c2.a/255+")");

        return grad;
    }
}

function setup() {
    // Setup element references
    Elements.setup();

    WINDOW = new Window();

    // Add the current year
    WINDOW.calandar.addNewYear(WINDOW.calandar.currentYear, true);

    // Select current month
    WINDOW.calandar.selectCurrentMonth();

    // Update current day
    WINDOW.calandar.getCurrentDay().setCurrent();

}

setup();
