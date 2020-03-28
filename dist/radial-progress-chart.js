(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RadialProgressChart = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var d3;

// RadialProgressChart object
function RadialProgressChart(query, options) {

    // verify d3 is loaded
    d3 = (typeof window !== 'undefined' && window.d3) ? window.d3 : typeof require !== 'undefined' ? require("d3") : undefined;
    if (!d3) throw new Error('d3 object is missing. D3.js library has to be loaded before.');

    var self = this;
    self.options = RadialProgressChart.normalizeOptions(options);

    // internal  variables
    var series = self.options.series
        , width = 15 + ((self.options.diameter / 2) + (self.options.stroke.width * self.options.series.length) + (self.options.stroke.gap * self.options.series.length - 1)) * 2
        , height = width
        , dim = "0 0 " + height + " " + width
        , τ = 2 * Math.PI
        , inner = []
        , outer = [];

    function innerRadius(item) {
        var radius = inner[item.index];
        if (radius) return radius;

        // first ring based on diameter and the rest based on the previous outer radius plus gap
        radius = item.index === 0 ? self.options.diameter / 2 : outer[item.index - 1] + self.options.stroke.gap;
        inner[item.index] = radius;
        return radius;
    }

    function outerRadius(item) {
        var radius = outer[item.index];
        if (radius) return radius;

        // based on the previous inner radius + stroke width
        radius = inner[item.index] + self.options.stroke.width;
        outer[item.index] = radius;
        return radius;
    }

    self.progress = d3.arc()
        .startAngle(0)
        .endAngle(function (item) {
            return item.percentage / 100 * τ;
        })
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(function (d) {
            return (self.options.stroke.width / 2);
        });

    var background = d3.arc()
        .startAngle(0)
        .endAngle(τ)
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    // create svg
    self.svg = d3.select(query).append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("viewBox", dim)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    // add gradients defs
    var defs = self.svg.append("svg:defs");
    series.forEach(function (item) {
        if (item.color.linearGradient || item.color.radialGradient) {
            var gradient = RadialProgressChart.Gradient.toSVGElement('gradient' + item.index, item.color);
            defs.node().appendChild(gradient);
        }
    });

    // add shadows defs
    defs = self.svg.append("svg:defs");
    var dropshadowId = "dropshadow-" + Math.random();
    var filter = defs.append("filter").attr("id", dropshadowId);
    if (self.options.shadow.width > 0) {

        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", self.options.shadow.width)
            .attr("result", "blur");

        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 1)
            .attr("dy", 1)
            .attr("result", "offsetBlur");
    }

    var feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // add inner text
    if (self.options.center) {
        self.svg.append("text")
            .attr('class', 'rbc-center-text')
            .attr("text-anchor", "middle")
            .attr('x', self.options.center.x + 'px')
            .attr('y', self.options.center.y + 'px')
            .selectAll('tspan')
            .data(self.options.center.content).enter()
            .append('tspan')
            .attr("dominant-baseline", function () {

                // Single lines can easily centered in the middle using dominant-baseline, multiline need to use y
                if (self.options.center.content.length === 1) {
                    return 'central';
                }
            })
            .attr('class', function (d, i) {
                return 'rbc-center-text-line' + i;
            })
            .attr('x', 0)
            .attr('dy', function (d, i) {
                if (i > 0) {
                    return '1.1em';
                }
            })
            .each(function (d) {
                if (typeof d === 'function') {
                    this.callback = d;
                }
            })
            .text(function (d) {
                if (typeof d === 'string') {
                    return d;
                }

                return '';
            });
    }

    // add ring structure
    self.field = self.svg.selectAll("g")
        .data(series)
        .enter().append("g");

    self.field.append("path").attr("class", "progress").attr("filter", "url(#" + dropshadowId + ")");

    self.field.append("path").attr("class", "bg")
        .style("fill", function (item) {
            return item.color.background;
        })
        .style("opacity", 0.2)
        .attr("d", background);

    self.field.append("text")
        .classed('rbc-label rbc-label-start', true)
        .attr("dominant-baseline", "central")
        .attr("x", "10")
        .attr("y", function (item) {
            return -(
                self.options.diameter / 2 +
                item.index * (self.options.stroke.gap + self.options.stroke.width) +
                self.options.stroke.width / 2
            );
        })
        .text(function (item) {
            return item.labelStart;
        });

    self.update();
}

/**
 * Update data to be visualized in the chart.
 *
 * @param {Object|Array} data Optional data you'd like to set for the chart before it will update. If not specified the update method will use the data that is already configured with the chart.
 * @example update([70, 10, 45])
 * @example update({series: [{value: 70}, 10, 45]})
 *
 */
RadialProgressChart.prototype.update = function (data) {
    var self = this;

    // parse new data
    if (data) {
        if (typeof data === 'number') {
            data = [data];
        }

        var series;

        if (Array.isArray(data)) {
            series = data;
        } else if (typeof data === 'object') {
            series = data.series || [];
        }

        for (var i = 0; i < series.length; i++) {
            this.options.series[i].previousValue = this.options.series[i].value;

            var item = series[i];
            if (typeof item === 'number') {
                this.options.series[i].value = item;
            } else if (typeof item === 'object') {
                this.options.series[i].value = item.value;
            }
        }
    }

    // calculate from percentage and new percentage for the progress animation
    self.options.series.forEach(function (item) {
        item.fromPercentage = item.percentage ? item.percentage : 5;
        item.percentage = (item.value - self.options.min) * 100 / (self.options.max - self.options.min);
    });

    var center = self.svg.select("text.rbc-center-text");

    // progress
    self.field.select("path.progress")
        .interrupt()
        .transition()
        .duration(self.options.animation.duration)
        .delay(function (d, i) {
            // delay between each item
            return i * self.options.animation.delay;
        })
        .ease(d3.easeElastic)
        .attrTween("d", function (item) {
            var interpolator = d3.interpolateNumber(item.fromPercentage, item.percentage);
            return function (t) {
                item.percentage = interpolator(t);
                return self.progress(item);
            };
        })
        .tween("center", function (item) {
            // Execute callbacks on each line
            if (self.options.center) {
                var interpolate = self.options.round ? d3.interpolateRound : d3.interpolateNumber;
                var interpolator = interpolate(item.previousValue || 0, item.value);
                return function (t) {
                    center
                        .selectAll('tspan')
                        .each(function () {
                            if (this.callback) {
                                d3.select(this).text(this.callback(interpolator(t), item.index, item));
                            }
                        });
                };
            }
        })
        .tween("interpolate-color", function (item) {
            if (item.color.interpolate && item.color.interpolate.length == 2) {
                var colorInterpolator = d3.interpolateHsl(item.color.interpolate[0], item.color.interpolate[1]);

                return function (t) {
                    var color = colorInterpolator(item.percentage / 100);
                    d3.select(this).style('fill', color);
                    d3.select(this.parentNode).select('path.bg').style('fill', color);
                };
            }
        })
        .style("fill", function (item) {
            if (item.color.solid) {
                return item.color.solid;
            }

            if (item.color.linearGradient || item.color.radialGradient) {
                return "url(#gradient" + item.index + ')';
            }
        });
};

/**
 * Remove svg and clean some references
 */
RadialProgressChart.prototype.destroy = function () {
    this.svg.remove();
    delete this.svg;
};

/**
 * Detach and normalize user's options input.
 */
RadialProgressChart.normalizeOptions = function (options) {
    if (!options || typeof options !== 'object') {
        options = {};
    }

    var _options = {
        diameter: options.diameter || 100,
        stroke: {
            width: options.stroke && options.stroke.width || 40,
            gap: (!options.stroke || options.stroke.gap === undefined) ? 2 : options.stroke.gap
        },
        shadow: {
            width: (!options.shadow || options.shadow.width === null) ? 4 : options.shadow.width
        },
        animation: {
            duration: options.animation && options.animation.duration || 1750,
            delay: options.animation && options.animation.delay || 200
        },
        min: options.min || 0,
        max: options.max || 100,
        round: options.round !== undefined ? !!options.round : true,
        series: options.series || [],
        center: RadialProgressChart.normalizeCenter(options.center)
    };

    var defaultColorsIterator = new RadialProgressChart.ColorsIterator();
    for (var i = 0, length = _options.series.length; i < length; i++) {
        var item = options.series[i];

        // convert number to object
        if (typeof item === 'number') {
            item = {value: item};
        }

        _options.series[i] = {
            index: i,
            value: item.value,
            labelStart: item.labelStart,
            color: RadialProgressChart.normalizeColor(item.color, defaultColorsIterator)
        };
    }

    return _options;
};

/**
 * Normalize different notations of color property
 *
 * @param {String|Array|Object} color
 * @example '#fe08b5'
 * @example { solid: '#fe08b5', background: '#000000' }
 * @example ['#000000', '#ff0000']
 * @example {
                linearGradient: { x1: '0%', y1: '100%', x2: '50%', y2: '0%'},
                stops: [
                  {offset: '0%', 'stop-color': '#fe08b5', 'stop-opacity': 1},
                  {offset: '100%', 'stop-color': '#ff1410', 'stop-opacity': 1}
                ]
              }
 * @example {
                radialGradient: {cx: '60', cy: '60', r: '50'},
                stops: [
                  {offset: '0%', 'stop-color': '#fe08b5', 'stop-opacity': 1},
                  {offset: '100%', 'stop-color': '#ff1410', 'stop-opacity': 1}
                ]
              }
 *
 */
RadialProgressChart.normalizeColor = function (color, defaultColorsIterator) {

    if (!color) {
        color = {solid: defaultColorsIterator.next()};
    } else if (typeof color === 'string') {
        color = {solid: color};
    } else if (Array.isArray(color)) {
        color = {interpolate: color};
    } else if (typeof color === 'object') {
        if (!color.solid && !color.interpolate && !color.linearGradient && !color.radialGradient) {
            color.solid = defaultColorsIterator.next();
        }
    }

    // Validate interpolate syntax
    if (color.interpolate) {
        if (color.interpolate.length !== 2) {
            throw new Error('interpolate array should contain two colors');
        }
    }

    // Validate gradient syntax
    if (color.linearGradient || color.radialGradient) {
        if (!color.stops || !Array.isArray(color.stops) || color.stops.length !== 2) {
            throw new Error('gradient syntax is malformed');
        }
    }

    // Set background when is not provided
    if (!color.background) {
        if (color.solid) {
            color.background = color.solid;
        } else if (color.interpolate) {
            color.background = color.interpolate[0];
        } else if (color.linearGradient || color.radialGradient) {
            color.background = color.stops[0]['stop-color'];
        }
    }

    return color;

};


/**
 * Normalize different notations of center property
 *
 * @param {String|Array|Function|Object} center
 * @example 'foo bar'
 * @example { content: 'foo bar', x: 10, y: 4 }
 * @example function(value, index, item) {}
 * @example ['foo bar', function(value, index, item) {}]
 */
RadialProgressChart.normalizeCenter = function (center) {
    if (!center) return null;

    // Convert to object notation
    if (center.constructor !== Object) {
        center = {content: center};
    }

    // Defaults
    center.content = center.content || [];
    center.x = center.x || 0;
    center.y = center.y || 0;

    // Convert content to array notation
    if (!Array.isArray(center.content)) {
        center.content = [center.content];
    }

    return center;
};

// Linear or Radial Gradient internal object
RadialProgressChart.Gradient = (function () {
    function Gradient() {
    }

    Gradient.toSVGElement = function (id, options) {
        var gradientType = options.linearGradient ? 'linearGradient' : 'radialGradient';
        var gradient = d3.select(document.createElementNS(d3.namespace("svg:text"), gradientType));
            gradient.attr(options[gradientType]);
            gradient.attr('id', id);

        options.stops.forEach(function (stopAttrs) {
            gradient.append("svg:stop").attr(stopAttrs);
        });

        this.background = options.stops[0]['stop-color'];

        return gradient.node();
    };

    return Gradient;
})();

// Default colors iterator
RadialProgressChart.ColorsIterator = (function () {

    ColorsIterator.DEFAULT_COLORS = ["#1ad5de", "#a0ff03", "#e90b3a", '#ff9500', '#007aff', '#ffcc00', '#5856d6', '#8e8e93'];

    function ColorsIterator() {
        this.index = 0;
    }

    ColorsIterator.prototype.next = function () {
        if (this.index === ColorsIterator.DEFAULT_COLORS.length) {
            this.index = 0;
        }

        return ColorsIterator.DEFAULT_COLORS[this.index++];
    };

    return ColorsIterator;
})();


// Export RadialProgressChart object
if (typeof module !== "undefined") module.exports = RadialProgressChart;
},{"d3":undefined}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBkMztcblxuLy8gUmFkaWFsUHJvZ3Jlc3NDaGFydCBvYmplY3RcbmZ1bmN0aW9uIFJhZGlhbFByb2dyZXNzQ2hhcnQocXVlcnksIG9wdGlvbnMpIHtcblxuICAgIC8vIHZlcmlmeSBkMyBpcyBsb2FkZWRcbiAgICBkMyA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZDMpID8gd2luZG93LmQzIDogdHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnID8gcmVxdWlyZShcImQzXCIpIDogdW5kZWZpbmVkO1xuICAgIGlmICghZDMpIHRocm93IG5ldyBFcnJvcignZDMgb2JqZWN0IGlzIG1pc3NpbmcuIEQzLmpzIGxpYnJhcnkgaGFzIHRvIGJlIGxvYWRlZCBiZWZvcmUuJyk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5vcHRpb25zID0gUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gaW50ZXJuYWwgIHZhcmlhYmxlc1xuICAgIHZhciBzZXJpZXMgPSBzZWxmLm9wdGlvbnMuc2VyaWVzXG4gICAgICAgICwgd2lkdGggPSAxNSArICgoc2VsZi5vcHRpb25zLmRpYW1ldGVyIC8gMikgKyAoc2VsZi5vcHRpb25zLnN0cm9rZS53aWR0aCAqIHNlbGYub3B0aW9ucy5zZXJpZXMubGVuZ3RoKSArIChzZWxmLm9wdGlvbnMuc3Ryb2tlLmdhcCAqIHNlbGYub3B0aW9ucy5zZXJpZXMubGVuZ3RoIC0gMSkpICogMlxuICAgICAgICAsIGhlaWdodCA9IHdpZHRoXG4gICAgICAgICwgZGltID0gXCIwIDAgXCIgKyBoZWlnaHQgKyBcIiBcIiArIHdpZHRoXG4gICAgICAgICwgz4QgPSAyICogTWF0aC5QSVxuICAgICAgICAsIGlubmVyID0gW11cbiAgICAgICAgLCBvdXRlciA9IFtdO1xuXG4gICAgZnVuY3Rpb24gaW5uZXJSYWRpdXMoaXRlbSkge1xuICAgICAgICB2YXIgcmFkaXVzID0gaW5uZXJbaXRlbS5pbmRleF07XG4gICAgICAgIGlmIChyYWRpdXMpIHJldHVybiByYWRpdXM7XG5cbiAgICAgICAgLy8gZmlyc3QgcmluZyBiYXNlZCBvbiBkaWFtZXRlciBhbmQgdGhlIHJlc3QgYmFzZWQgb24gdGhlIHByZXZpb3VzIG91dGVyIHJhZGl1cyBwbHVzIGdhcFxuICAgICAgICByYWRpdXMgPSBpdGVtLmluZGV4ID09PSAwID8gc2VsZi5vcHRpb25zLmRpYW1ldGVyIC8gMiA6IG91dGVyW2l0ZW0uaW5kZXggLSAxXSArIHNlbGYub3B0aW9ucy5zdHJva2UuZ2FwO1xuICAgICAgICBpbm5lcltpdGVtLmluZGV4XSA9IHJhZGl1cztcbiAgICAgICAgcmV0dXJuIHJhZGl1cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvdXRlclJhZGl1cyhpdGVtKSB7XG4gICAgICAgIHZhciByYWRpdXMgPSBvdXRlcltpdGVtLmluZGV4XTtcbiAgICAgICAgaWYgKHJhZGl1cykgcmV0dXJuIHJhZGl1cztcblxuICAgICAgICAvLyBiYXNlZCBvbiB0aGUgcHJldmlvdXMgaW5uZXIgcmFkaXVzICsgc3Ryb2tlIHdpZHRoXG4gICAgICAgIHJhZGl1cyA9IGlubmVyW2l0ZW0uaW5kZXhdICsgc2VsZi5vcHRpb25zLnN0cm9rZS53aWR0aDtcbiAgICAgICAgb3V0ZXJbaXRlbS5pbmRleF0gPSByYWRpdXM7XG4gICAgICAgIHJldHVybiByYWRpdXM7XG4gICAgfVxuXG4gICAgc2VsZi5wcm9ncmVzcyA9IGQzLmFyYygpXG4gICAgICAgIC5zdGFydEFuZ2xlKDApXG4gICAgICAgIC5lbmRBbmdsZShmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGVyY2VudGFnZSAvIDEwMCAqIM+EO1xuICAgICAgICB9KVxuICAgICAgICAuaW5uZXJSYWRpdXMoaW5uZXJSYWRpdXMpXG4gICAgICAgIC5vdXRlclJhZGl1cyhvdXRlclJhZGl1cylcbiAgICAgICAgLmNvcm5lclJhZGl1cyhmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuIChzZWxmLm9wdGlvbnMuc3Ryb2tlLndpZHRoIC8gMik7XG4gICAgICAgIH0pO1xuXG4gICAgdmFyIGJhY2tncm91bmQgPSBkMy5hcmMoKVxuICAgICAgICAuc3RhcnRBbmdsZSgwKVxuICAgICAgICAuZW5kQW5nbGUoz4QpXG4gICAgICAgIC5pbm5lclJhZGl1cyhpbm5lclJhZGl1cylcbiAgICAgICAgLm91dGVyUmFkaXVzKG91dGVyUmFkaXVzKTtcblxuICAgIC8vIGNyZWF0ZSBzdmdcbiAgICBzZWxmLnN2ZyA9IGQzLnNlbGVjdChxdWVyeSkuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgIC5hdHRyKFwicHJlc2VydmVBc3BlY3RSYXRpb1wiLCBcInhNaW5ZTWluIG1lZXRcIilcbiAgICAgICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpXG4gICAgICAgIC5hdHRyKFwieG1sbnM6eGxpbmtcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIFwiMTAwJVwiKVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIFwiMTAwJVwiKVxuICAgICAgICAuYXR0cihcInZpZXdCb3hcIiwgZGltKVxuICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIHdpZHRoIC8gMiArIFwiLFwiICsgaGVpZ2h0IC8gMiArIFwiKVwiKTtcblxuICAgIC8vIGFkZCBncmFkaWVudHMgZGVmc1xuICAgIHZhciBkZWZzID0gc2VsZi5zdmcuYXBwZW5kKFwic3ZnOmRlZnNcIik7XG4gICAgc2VyaWVzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYgKGl0ZW0uY29sb3IubGluZWFyR3JhZGllbnQgfHwgaXRlbS5jb2xvci5yYWRpYWxHcmFkaWVudCkge1xuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gUmFkaWFsUHJvZ3Jlc3NDaGFydC5HcmFkaWVudC50b1NWR0VsZW1lbnQoJ2dyYWRpZW50JyArIGl0ZW0uaW5kZXgsIGl0ZW0uY29sb3IpO1xuICAgICAgICAgICAgZGVmcy5ub2RlKCkuYXBwZW5kQ2hpbGQoZ3JhZGllbnQpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBhZGQgc2hhZG93cyBkZWZzXG4gICAgZGVmcyA9IHNlbGYuc3ZnLmFwcGVuZChcInN2ZzpkZWZzXCIpO1xuICAgIHZhciBkcm9wc2hhZG93SWQgPSBcImRyb3BzaGFkb3ctXCIgKyBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciBmaWx0ZXIgPSBkZWZzLmFwcGVuZChcImZpbHRlclwiKS5hdHRyKFwiaWRcIiwgZHJvcHNoYWRvd0lkKTtcbiAgICBpZiAoc2VsZi5vcHRpb25zLnNoYWRvdy53aWR0aCA+IDApIHtcblxuICAgICAgICBmaWx0ZXIuYXBwZW5kKFwiZmVHYXVzc2lhbkJsdXJcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaW5cIiwgXCJTb3VyY2VBbHBoYVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdGREZXZpYXRpb25cIiwgc2VsZi5vcHRpb25zLnNoYWRvdy53aWR0aClcbiAgICAgICAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiYmx1clwiKTtcblxuICAgICAgICBmaWx0ZXIuYXBwZW5kKFwiZmVPZmZzZXRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaW5cIiwgXCJibHVyXCIpXG4gICAgICAgICAgICAuYXR0cihcImR4XCIsIDEpXG4gICAgICAgICAgICAuYXR0cihcImR5XCIsIDEpXG4gICAgICAgICAgICAuYXR0cihcInJlc3VsdFwiLCBcIm9mZnNldEJsdXJcIik7XG4gICAgfVxuXG4gICAgdmFyIGZlTWVyZ2UgPSBmaWx0ZXIuYXBwZW5kKFwiZmVNZXJnZVwiKTtcbiAgICBmZU1lcmdlLmFwcGVuZChcImZlTWVyZ2VOb2RlXCIpLmF0dHIoXCJpblwiLCBcIm9mZnNldEJsdXJcIik7XG4gICAgZmVNZXJnZS5hcHBlbmQoXCJmZU1lcmdlTm9kZVwiKS5hdHRyKFwiaW5cIiwgXCJTb3VyY2VHcmFwaGljXCIpO1xuXG4gICAgLy8gYWRkIGlubmVyIHRleHRcbiAgICBpZiAoc2VsZi5vcHRpb25zLmNlbnRlcikge1xuICAgICAgICBzZWxmLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmJjLWNlbnRlci10ZXh0JylcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC5hdHRyKCd4Jywgc2VsZi5vcHRpb25zLmNlbnRlci54ICsgJ3B4JylcbiAgICAgICAgICAgIC5hdHRyKCd5Jywgc2VsZi5vcHRpb25zLmNlbnRlci55ICsgJ3B4JylcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJ3RzcGFuJylcbiAgICAgICAgICAgIC5kYXRhKHNlbGYub3B0aW9ucy5jZW50ZXIuY29udGVudCkuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBTaW5nbGUgbGluZXMgY2FuIGVhc2lseSBjZW50ZXJlZCBpbiB0aGUgbWlkZGxlIHVzaW5nIGRvbWluYW50LWJhc2VsaW5lLCBtdWx0aWxpbmUgbmVlZCB0byB1c2UgeVxuICAgICAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMuY2VudGVyLmNvbnRlbnQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnY2VudHJhbCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyYmMtY2VudGVyLXRleHQtbGluZScgKyBpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCd4JywgMClcbiAgICAgICAgICAgIC5hdHRyKCdkeScsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnMS4xZW0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGFkZCByaW5nIHN0cnVjdHVyZVxuICAgIHNlbGYuZmllbGQgPSBzZWxmLnN2Zy5zZWxlY3RBbGwoXCJnXCIpXG4gICAgICAgIC5kYXRhKHNlcmllcylcbiAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwiZ1wiKTtcblxuICAgIHNlbGYuZmllbGQuYXBwZW5kKFwicGF0aFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJwcm9ncmVzc1wiKS5hdHRyKFwiZmlsdGVyXCIsIFwidXJsKCNcIiArIGRyb3BzaGFkb3dJZCArIFwiKVwiKTtcblxuICAgIHNlbGYuZmllbGQuYXBwZW5kKFwicGF0aFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiZ1wiKVxuICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5jb2xvci5iYWNrZ3JvdW5kO1xuICAgICAgICB9KVxuICAgICAgICAuc3R5bGUoXCJvcGFjaXR5XCIsIDAuMilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGJhY2tncm91bmQpO1xuXG4gICAgc2VsZi5maWVsZC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIC5jbGFzc2VkKCdyYmMtbGFiZWwgcmJjLWxhYmVsLXN0YXJ0JywgdHJ1ZSlcbiAgICAgICAgLmF0dHIoXCJkb21pbmFudC1iYXNlbGluZVwiLCBcImNlbnRyYWxcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIFwiMTBcIilcbiAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gLShcbiAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMuZGlhbWV0ZXIgLyAyICtcbiAgICAgICAgICAgICAgICBpdGVtLmluZGV4ICogKHNlbGYub3B0aW9ucy5zdHJva2UuZ2FwICsgc2VsZi5vcHRpb25zLnN0cm9rZS53aWR0aCkgK1xuICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5zdHJva2Uud2lkdGggLyAyXG4gICAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0ubGFiZWxTdGFydDtcbiAgICAgICAgfSk7XG5cbiAgICBzZWxmLnVwZGF0ZSgpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBkYXRhIHRvIGJlIHZpc3VhbGl6ZWQgaW4gdGhlIGNoYXJ0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBkYXRhIE9wdGlvbmFsIGRhdGEgeW91J2QgbGlrZSB0byBzZXQgZm9yIHRoZSBjaGFydCBiZWZvcmUgaXQgd2lsbCB1cGRhdGUuIElmIG5vdCBzcGVjaWZpZWQgdGhlIHVwZGF0ZSBtZXRob2Qgd2lsbCB1c2UgdGhlIGRhdGEgdGhhdCBpcyBhbHJlYWR5IGNvbmZpZ3VyZWQgd2l0aCB0aGUgY2hhcnQuXG4gKiBAZXhhbXBsZSB1cGRhdGUoWzcwLCAxMCwgNDVdKVxuICogQGV4YW1wbGUgdXBkYXRlKHtzZXJpZXM6IFt7dmFsdWU6IDcwfSwgMTAsIDQ1XX0pXG4gKlxuICovXG5SYWRpYWxQcm9ncmVzc0NoYXJ0LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIHBhcnNlIG5ldyBkYXRhXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZXJpZXM7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIHNlcmllcyA9IGRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBzZXJpZXMgPSBkYXRhLnNlcmllcyB8fCBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnByZXZpb3VzVmFsdWUgPSB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgaXRlbSA9IHNlcmllc1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLnNlcmllc1tpXS52YWx1ZSA9IGl0ZW0udmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjYWxjdWxhdGUgZnJvbSBwZXJjZW50YWdlIGFuZCBuZXcgcGVyY2VudGFnZSBmb3IgdGhlIHByb2dyZXNzIGFuaW1hdGlvblxuICAgIHNlbGYub3B0aW9ucy5zZXJpZXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpdGVtLmZyb21QZXJjZW50YWdlID0gaXRlbS5wZXJjZW50YWdlID8gaXRlbS5wZXJjZW50YWdlIDogNTtcbiAgICAgICAgaXRlbS5wZXJjZW50YWdlID0gKGl0ZW0udmFsdWUgLSBzZWxmLm9wdGlvbnMubWluKSAqIDEwMCAvIChzZWxmLm9wdGlvbnMubWF4IC0gc2VsZi5vcHRpb25zLm1pbik7XG4gICAgfSk7XG5cbiAgICB2YXIgY2VudGVyID0gc2VsZi5zdmcuc2VsZWN0KFwidGV4dC5yYmMtY2VudGVyLXRleHRcIik7XG5cbiAgICAvLyBwcm9ncmVzc1xuICAgIHNlbGYuZmllbGQuc2VsZWN0KFwicGF0aC5wcm9ncmVzc1wiKVxuICAgICAgICAuaW50ZXJydXB0KClcbiAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oc2VsZi5vcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbilcbiAgICAgICAgLmRlbGF5KGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAvLyBkZWxheSBiZXR3ZWVuIGVhY2ggaXRlbVxuICAgICAgICAgICAgcmV0dXJuIGkgKiBzZWxmLm9wdGlvbnMuYW5pbWF0aW9uLmRlbGF5O1xuICAgICAgICB9KVxuICAgICAgICAuZWFzZShkMy5lYXNlRWxhc3RpYylcbiAgICAgICAgLmF0dHJUd2VlbihcImRcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBpbnRlcnBvbGF0b3IgPSBkMy5pbnRlcnBvbGF0ZU51bWJlcihpdGVtLmZyb21QZXJjZW50YWdlLCBpdGVtLnBlcmNlbnRhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICAgICAgaXRlbS5wZXJjZW50YWdlID0gaW50ZXJwb2xhdG9yKHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnByb2dyZXNzKGl0ZW0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSlcbiAgICAgICAgLnR3ZWVuKFwiY2VudGVyXCIsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIGNhbGxiYWNrcyBvbiBlYWNoIGxpbmVcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMuY2VudGVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGludGVycG9sYXRlID0gc2VsZi5vcHRpb25zLnJvdW5kID8gZDMuaW50ZXJwb2xhdGVSb3VuZCA6IGQzLmludGVycG9sYXRlTnVtYmVyO1xuICAgICAgICAgICAgICAgIHZhciBpbnRlcnBvbGF0b3IgPSBpbnRlcnBvbGF0ZShpdGVtLnByZXZpb3VzVmFsdWUgfHwgMCwgaXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbnRlclxuICAgICAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgndHNwYW4nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS50ZXh0KHRoaXMuY2FsbGJhY2soaW50ZXJwb2xhdG9yKHQpLCBpdGVtLmluZGV4LCBpdGVtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnR3ZWVuKFwiaW50ZXJwb2xhdGUtY29sb3JcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChpdGVtLmNvbG9yLmludGVycG9sYXRlICYmIGl0ZW0uY29sb3IuaW50ZXJwb2xhdGUubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sb3JJbnRlcnBvbGF0b3IgPSBkMy5pbnRlcnBvbGF0ZUhzbChpdGVtLmNvbG9yLmludGVycG9sYXRlWzBdLCBpdGVtLmNvbG9yLmludGVycG9sYXRlWzFdKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBjb2xvckludGVycG9sYXRvcihpdGVtLnBlcmNlbnRhZ2UgLyAxMDApO1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2ZpbGwnLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdCgncGF0aC5iZycpLnN0eWxlKCdmaWxsJywgY29sb3IpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChpdGVtLmNvbG9yLnNvbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uY29sb3Iuc29saWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpdGVtLmNvbG9yLmxpbmVhckdyYWRpZW50IHx8IGl0ZW0uY29sb3IucmFkaWFsR3JhZGllbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1cmwoI2dyYWRpZW50XCIgKyBpdGVtLmluZGV4ICsgJyknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHN2ZyBhbmQgY2xlYW4gc29tZSByZWZlcmVuY2VzXG4gKi9cblJhZGlhbFByb2dyZXNzQ2hhcnQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdmcucmVtb3ZlKCk7XG4gICAgZGVsZXRlIHRoaXMuc3ZnO1xufTtcblxuLyoqXG4gKiBEZXRhY2ggYW5kIG5vcm1hbGl6ZSB1c2VyJ3Mgb3B0aW9ucyBpbnB1dC5cbiAqL1xuUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMgfHwgdHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICB2YXIgX29wdGlvbnMgPSB7XG4gICAgICAgIGRpYW1ldGVyOiBvcHRpb25zLmRpYW1ldGVyIHx8IDEwMCxcbiAgICAgICAgc3Ryb2tlOiB7XG4gICAgICAgICAgICB3aWR0aDogb3B0aW9ucy5zdHJva2UgJiYgb3B0aW9ucy5zdHJva2Uud2lkdGggfHwgNDAsXG4gICAgICAgICAgICBnYXA6ICghb3B0aW9ucy5zdHJva2UgfHwgb3B0aW9ucy5zdHJva2UuZ2FwID09PSB1bmRlZmluZWQpID8gMiA6IG9wdGlvbnMuc3Ryb2tlLmdhcFxuICAgICAgICB9LFxuICAgICAgICBzaGFkb3c6IHtcbiAgICAgICAgICAgIHdpZHRoOiAoIW9wdGlvbnMuc2hhZG93IHx8IG9wdGlvbnMuc2hhZG93LndpZHRoID09PSBudWxsKSA/IDQgOiBvcHRpb25zLnNoYWRvdy53aWR0aFxuICAgICAgICB9LFxuICAgICAgICBhbmltYXRpb246IHtcbiAgICAgICAgICAgIGR1cmF0aW9uOiBvcHRpb25zLmFuaW1hdGlvbiAmJiBvcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbiB8fCAxNzUwLFxuICAgICAgICAgICAgZGVsYXk6IG9wdGlvbnMuYW5pbWF0aW9uICYmIG9wdGlvbnMuYW5pbWF0aW9uLmRlbGF5IHx8IDIwMFxuICAgICAgICB9LFxuICAgICAgICBtaW46IG9wdGlvbnMubWluIHx8IDAsXG4gICAgICAgIG1heDogb3B0aW9ucy5tYXggfHwgMTAwLFxuICAgICAgICByb3VuZDogb3B0aW9ucy5yb3VuZCAhPT0gdW5kZWZpbmVkID8gISFvcHRpb25zLnJvdW5kIDogdHJ1ZSxcbiAgICAgICAgc2VyaWVzOiBvcHRpb25zLnNlcmllcyB8fCBbXSxcbiAgICAgICAgY2VudGVyOiBSYWRpYWxQcm9ncmVzc0NoYXJ0Lm5vcm1hbGl6ZUNlbnRlcihvcHRpb25zLmNlbnRlcilcbiAgICB9O1xuXG4gICAgdmFyIGRlZmF1bHRDb2xvcnNJdGVyYXRvciA9IG5ldyBSYWRpYWxQcm9ncmVzc0NoYXJ0LkNvbG9yc0l0ZXJhdG9yKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IF9vcHRpb25zLnNlcmllcy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaXRlbSA9IG9wdGlvbnMuc2VyaWVzW2ldO1xuXG4gICAgICAgIC8vIGNvbnZlcnQgbnVtYmVyIHRvIG9iamVjdFxuICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBpdGVtID0ge3ZhbHVlOiBpdGVtfTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9vcHRpb25zLnNlcmllc1tpXSA9IHtcbiAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICBsYWJlbFN0YXJ0OiBpdGVtLmxhYmVsU3RhcnQsXG4gICAgICAgICAgICBjb2xvcjogUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVDb2xvcihpdGVtLmNvbG9yLCBkZWZhdWx0Q29sb3JzSXRlcmF0b3IpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIF9vcHRpb25zO1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgZGlmZmVyZW50IG5vdGF0aW9ucyBvZiBjb2xvciBwcm9wZXJ0eVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fE9iamVjdH0gY29sb3JcbiAqIEBleGFtcGxlICcjZmUwOGI1J1xuICogQGV4YW1wbGUgeyBzb2xpZDogJyNmZTA4YjUnLCBiYWNrZ3JvdW5kOiAnIzAwMDAwMCcgfVxuICogQGV4YW1wbGUgWycjMDAwMDAwJywgJyNmZjAwMDAnXVxuICogQGV4YW1wbGUge1xuICAgICAgICAgICAgICAgIGxpbmVhckdyYWRpZW50OiB7IHgxOiAnMCUnLCB5MTogJzEwMCUnLCB4MjogJzUwJScsIHkyOiAnMCUnfSxcbiAgICAgICAgICAgICAgICBzdG9wczogW1xuICAgICAgICAgICAgICAgICAge29mZnNldDogJzAlJywgJ3N0b3AtY29sb3InOiAnI2ZlMDhiNScsICdzdG9wLW9wYWNpdHknOiAxfSxcbiAgICAgICAgICAgICAgICAgIHtvZmZzZXQ6ICcxMDAlJywgJ3N0b3AtY29sb3InOiAnI2ZmMTQxMCcsICdzdG9wLW9wYWNpdHknOiAxfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICogQGV4YW1wbGUge1xuICAgICAgICAgICAgICAgIHJhZGlhbEdyYWRpZW50OiB7Y3g6ICc2MCcsIGN5OiAnNjAnLCByOiAnNTAnfSxcbiAgICAgICAgICAgICAgICBzdG9wczogW1xuICAgICAgICAgICAgICAgICAge29mZnNldDogJzAlJywgJ3N0b3AtY29sb3InOiAnI2ZlMDhiNScsICdzdG9wLW9wYWNpdHknOiAxfSxcbiAgICAgICAgICAgICAgICAgIHtvZmZzZXQ6ICcxMDAlJywgJ3N0b3AtY29sb3InOiAnI2ZmMTQxMCcsICdzdG9wLW9wYWNpdHknOiAxfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICpcbiAqL1xuUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVDb2xvciA9IGZ1bmN0aW9uIChjb2xvciwgZGVmYXVsdENvbG9yc0l0ZXJhdG9yKSB7XG5cbiAgICBpZiAoIWNvbG9yKSB7XG4gICAgICAgIGNvbG9yID0ge3NvbGlkOiBkZWZhdWx0Q29sb3JzSXRlcmF0b3IubmV4dCgpfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2xvciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29sb3IgPSB7c29saWQ6IGNvbG9yfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoY29sb3IpKSB7XG4gICAgICAgIGNvbG9yID0ge2ludGVycG9sYXRlOiBjb2xvcn07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29sb3IgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmICghY29sb3Iuc29saWQgJiYgIWNvbG9yLmludGVycG9sYXRlICYmICFjb2xvci5saW5lYXJHcmFkaWVudCAmJiAhY29sb3IucmFkaWFsR3JhZGllbnQpIHtcbiAgICAgICAgICAgIGNvbG9yLnNvbGlkID0gZGVmYXVsdENvbG9yc0l0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGludGVycG9sYXRlIHN5bnRheFxuICAgIGlmIChjb2xvci5pbnRlcnBvbGF0ZSkge1xuICAgICAgICBpZiAoY29sb3IuaW50ZXJwb2xhdGUubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludGVycG9sYXRlIGFycmF5IHNob3VsZCBjb250YWluIHR3byBjb2xvcnMnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGdyYWRpZW50IHN5bnRheFxuICAgIGlmIChjb2xvci5saW5lYXJHcmFkaWVudCB8fCBjb2xvci5yYWRpYWxHcmFkaWVudCkge1xuICAgICAgICBpZiAoIWNvbG9yLnN0b3BzIHx8ICFBcnJheS5pc0FycmF5KGNvbG9yLnN0b3BzKSB8fCBjb2xvci5zdG9wcy5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZ3JhZGllbnQgc3ludGF4IGlzIG1hbGZvcm1lZCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2V0IGJhY2tncm91bmQgd2hlbiBpcyBub3QgcHJvdmlkZWRcbiAgICBpZiAoIWNvbG9yLmJhY2tncm91bmQpIHtcbiAgICAgICAgaWYgKGNvbG9yLnNvbGlkKSB7XG4gICAgICAgICAgICBjb2xvci5iYWNrZ3JvdW5kID0gY29sb3Iuc29saWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoY29sb3IuaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgICAgIGNvbG9yLmJhY2tncm91bmQgPSBjb2xvci5pbnRlcnBvbGF0ZVswXTtcbiAgICAgICAgfSBlbHNlIGlmIChjb2xvci5saW5lYXJHcmFkaWVudCB8fCBjb2xvci5yYWRpYWxHcmFkaWVudCkge1xuICAgICAgICAgICAgY29sb3IuYmFja2dyb3VuZCA9IGNvbG9yLnN0b3BzWzBdWydzdG9wLWNvbG9yJ107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3I7XG5cbn07XG5cblxuLyoqXG4gKiBOb3JtYWxpemUgZGlmZmVyZW50IG5vdGF0aW9ucyBvZiBjZW50ZXIgcHJvcGVydHlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheXxGdW5jdGlvbnxPYmplY3R9IGNlbnRlclxuICogQGV4YW1wbGUgJ2ZvbyBiYXInXG4gKiBAZXhhbXBsZSB7IGNvbnRlbnQ6ICdmb28gYmFyJywgeDogMTAsIHk6IDQgfVxuICogQGV4YW1wbGUgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBpdGVtKSB7fVxuICogQGV4YW1wbGUgWydmb28gYmFyJywgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBpdGVtKSB7fV1cbiAqL1xuUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVDZW50ZXIgPSBmdW5jdGlvbiAoY2VudGVyKSB7XG4gICAgaWYgKCFjZW50ZXIpIHJldHVybiBudWxsO1xuXG4gICAgLy8gQ29udmVydCB0byBvYmplY3Qgbm90YXRpb25cbiAgICBpZiAoY2VudGVyLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgICAgY2VudGVyID0ge2NvbnRlbnQ6IGNlbnRlcn07XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdHNcbiAgICBjZW50ZXIuY29udGVudCA9IGNlbnRlci5jb250ZW50IHx8IFtdO1xuICAgIGNlbnRlci54ID0gY2VudGVyLnggfHwgMDtcbiAgICBjZW50ZXIueSA9IGNlbnRlci55IHx8IDA7XG5cbiAgICAvLyBDb252ZXJ0IGNvbnRlbnQgdG8gYXJyYXkgbm90YXRpb25cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2VudGVyLmNvbnRlbnQpKSB7XG4gICAgICAgIGNlbnRlci5jb250ZW50ID0gW2NlbnRlci5jb250ZW50XTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2VudGVyO1xufTtcblxuLy8gTGluZWFyIG9yIFJhZGlhbCBHcmFkaWVudCBpbnRlcm5hbCBvYmplY3RcblJhZGlhbFByb2dyZXNzQ2hhcnQuR3JhZGllbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEdyYWRpZW50KCkge1xuICAgIH1cblxuICAgIEdyYWRpZW50LnRvU1ZHRWxlbWVudCA9IGZ1bmN0aW9uIChpZCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgZ3JhZGllbnRUeXBlID0gb3B0aW9ucy5saW5lYXJHcmFkaWVudCA/ICdsaW5lYXJHcmFkaWVudCcgOiAncmFkaWFsR3JhZGllbnQnO1xuICAgICAgICB2YXIgZ3JhZGllbnQgPSBkMy5zZWxlY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGQzLm5hbWVzcGFjZShcInN2Zzp0ZXh0XCIpLCBncmFkaWVudFR5cGUpKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmF0dHIob3B0aW9uc1tncmFkaWVudFR5cGVdKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmF0dHIoJ2lkJywgaWQpO1xuXG4gICAgICAgIG9wdGlvbnMuc3RvcHMuZm9yRWFjaChmdW5jdGlvbiAoc3RvcEF0dHJzKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hcHBlbmQoXCJzdmc6c3RvcFwiKS5hdHRyKHN0b3BBdHRycyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IG9wdGlvbnMuc3RvcHNbMF1bJ3N0b3AtY29sb3InXTtcblxuICAgICAgICByZXR1cm4gZ3JhZGllbnQubm9kZSgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gR3JhZGllbnQ7XG59KSgpO1xuXG4vLyBEZWZhdWx0IGNvbG9ycyBpdGVyYXRvclxuUmFkaWFsUHJvZ3Jlc3NDaGFydC5Db2xvcnNJdGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBDb2xvcnNJdGVyYXRvci5ERUZBVUxUX0NPTE9SUyA9IFtcIiMxYWQ1ZGVcIiwgXCIjYTBmZjAzXCIsIFwiI2U5MGIzYVwiLCAnI2ZmOTUwMCcsICcjMDA3YWZmJywgJyNmZmNjMDAnLCAnIzU4NTZkNicsICcjOGU4ZTkzJ107XG5cbiAgICBmdW5jdGlvbiBDb2xvcnNJdGVyYXRvcigpIHtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgQ29sb3JzSXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmluZGV4ID09PSBDb2xvcnNJdGVyYXRvci5ERUZBVUxUX0NPTE9SUy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIENvbG9yc0l0ZXJhdG9yLkRFRkFVTFRfQ09MT1JTW3RoaXMuaW5kZXgrK107XG4gICAgfTtcblxuICAgIHJldHVybiBDb2xvcnNJdGVyYXRvcjtcbn0pKCk7XG5cblxuLy8gRXhwb3J0IFJhZGlhbFByb2dyZXNzQ2hhcnQgb2JqZWN0XG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIikgbW9kdWxlLmV4cG9ydHMgPSBSYWRpYWxQcm9ncmVzc0NoYXJ0OyJdfQ==
