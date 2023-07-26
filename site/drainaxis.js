// I hacked this together from the 'log2' scale example as a means of 'compressing' a graph
//
// It splits the Y axis into 2 parts - a lower "detailed" area and a higher 'less detailed' one
//
// this.split is the breakpoint value for the split
// this.ratio is the decimal percentage of the graph which should be UNDER this.split
//
// Example: this.split=500, this.ratio=.66 -> values upto 500 in the bottom 66% of the graph - everything else in the top 33%

class DrainAxis extends Chart.Scale {
    constructor(cfg) {
        super(cfg);
        this.split = 500
        this.ratio = .66
    }

    parse(raw, index) {
        const value = Chart.LinearScale.prototype.parse.apply(this, [raw, index]);
        return isFinite(value) && value > -1 ? value : null;
    }

    determineDataLimits() {
        const {min, max} = this.getMinMax(true);
        this.min = isFinite(min) ? Math.max(0, min) : null;
        this.max = isFinite(max) ? Math.max(0, max) : null;
    }

    buildTicks() {
        const ticks = [];

        ticks.push({value: Math.round(this.split/2,0)})
        ticks.push({value: this.split})
        ticks.push({value: Math.floor(this.max/250)*250})
        return ticks;
    }

    /**
     * @protected
     */
    configure() {
        super.configure();    
        this.minp = [0,0]
        this.maxp = [0,0]
    }

    getPixelForValue(value) {
        if (value === undefined || value === 0)
            value = this.min
        
        var hw = this.max-this.split
        if (value > this.split)
            value = (value-this.split) / hw * (1 - this.ratio) + this.ratio
        else
            value = value / this.split * this.ratio
        return this.getPixelForDecimal(value)
    }

    getValueForPixel(pixel) {
        const decimal = this.getDecimalForPixel(pixel);
        var rval
        if (decimal > this.ratio)
            rval = (this.max-this.split)/(1-this.ratio)*(decimal-this.ratio)+this.split
        else    
            rval = this.split / this.ratio * decimal
        return rval
    }
}

DrainAxis.id = 'Drain';
DrainAxis.defaults = {};