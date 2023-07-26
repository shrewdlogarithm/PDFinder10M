var chart

var devbuttonstate = 0

var chartdata = []
var minval = 99999
var maxval = 0

function toggleDarkMode() {
    halfmoon.toggleDarkMode()
}

function cleardata() {
    minval = 99999
    maxval = 0
    chartdata = []      
    chartdirty = true
    $("table tbody").empty()
}

function goconnected() {
    cleardata()
    $("#device").attr("disabled",true)
    $("#devbutton").removeClass("disabled").attr("value","Disconnect from Device")
    $("#logfile").attr("disabled",true)
    $("#logbutton").addClass("disabled")
    devbuttonstate = 1
}

function godisconnected() {
    $("#device").attr("disabled",false)
    $("#devbutton").removeClass("disabled").attr("value","Connect to Device")
    $("#logfile").attr("disabled",false)
    $("#logbutton").removeClass("disabled")
    devbuttonstate = 0
}

function sameas(a,b) {
    if (Math.abs(a-b) < 20)
        return true
    else
        return false
}

function adddata(tim,val) {
    var row = "<tr id=\"" + tim.toString().replace(".","") + "\"><td><span>" + tim + "</span></td><td>" + val + "</td></tr>"
    $row = $(row)
    $row.data("datapoint",chartdata.length)
    $row.click(clickrow)
    $('table')
    .find('tbody').append($row)
    .trigger('addRows', [$row, false]);

    if (chartdata.length > 2) {
        if (sameas(chartdata[chartdata.length-1].y,val) && sameas(chartdata[chartdata.length-1].y,chartdata[chartdata.length-2].y))
            chartdata.pop()        
    }
    chartdata.push({y: val,x: tim})

    startdate = new Date(chartdata[0].x)
    enddate = new Date(chartdata[chartdata.length-1].x)
    test = enddate - startdate
    elapsed = ""
    if (test > 3600000)
        elapsed += Math.floor(test/3600000) + "h "
        test -= Math.floor(test/3600000)*3600000
    if (test > 60000)
        elapsed += Math.floor(test/60000) + "m "
        test -= Math.floor(test/60000)*60000
    if (test > 1000)
        elapsed += Math.floor(test/1000) + "s "
        test -= Math.floor(test/1000)*1000
    $("#elapsed-time").text(elapsed)
    if (val > maxval)
        maxval = val
    if (val > 0 && val < minval)
        minval = val
    $("#min-value").text(minval)
    $("#max-value").text(maxval)
    
    chartdirty = true
}

var chartdirty = false
function updatechart() {
    if (chartdirty) {
        chart.data.datasets[0].data = chartdata
        chart.update()
        chartdirty = false
    }
    setTimeout(updatechart,1000)
}

function scrollTableTo(element, container) {
    $(".highlightrow").removeClass("highlightrow")
    $(element).addClass("highlightrow")
    var containerTop = $(container).scrollTop(); 
    var containerBottom = containerTop + $(container).height(); 
    var elemTop = element.offsetTop;
    var elemBottom = elemTop + $(element).height(); 
    if (elemTop < containerTop) {
        $(container).scrollTop(elemTop);
    } else if (elemBottom > containerBottom) {
        $(container).scrollTop(elemBottom - $(container).height() + 50);
    }
}

function clickrow(e) {
    $(".highlightrow").removeClass("highlightrow")
    $(e.currentTarget).addClass("highlightrow")
    const tooltip = chart.tooltip;
    const chartArea = chart.chartArea;
    tooltip.setActiveElements([
    {
        datasetIndex: 0,
        index: $(e.currentTarget).data("datapoint"),
    }
    ],
    {
        x: (chartArea.left + chartArea.right) / 2,
        y: (chartArea.top + chartArea.bottom) / 2,
    });
    chart.update()
}

function loaddevs() {
    $.ajax("/loaddevs", {
        contentType : 'application/json',
        type : 'GET',
        success: function(response) {
            $("#device").attr("disabled",true).empty()
            for (dev in response.ble) {
                test = response.ble[dev].name == response.active?"SELECTED":""
                $("#device").append($("<option " + test + " value=\"ble:" + response.ble[dev].name + "\">Bluetooth: " + response.ble[dev].name + "</option>"))
            }
            for (dev in response.com) {
                test = response.com[dev].port == response.active?"SELECTED":""
                $("#device").append($("<option " + test + " value=\"com:" + response.com[dev].port + "\">Serial Port: " + response.com[dev].name + "</option>"))            
            }
            if (response.active) {
                $.ajax("/loadlog", {
                    data : JSON.stringify({"portname": $("#device")[0].value}),
                    contentType : 'application/json',
                    type : 'POST',
                    success: function(response) {
                        goconnected()
                        for (r in response) {
                            adddata(response[r][0],response[r][1])
                        }
                    },
                    error: function(xhr, ajaxOptions, thrownError) {
                        console.log(thrownError)
                    }
                })            
            } else
                $("#device").attr("disabled",false)
                $("#logfile").attr("disabled",false)
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(thrownError)
        }
    })
}

function getfiles() {
    $.ajax("/getfiles", {
        contentType : 'application/json',
        type : 'GET',
        success: function(response) {
            $("#logfile").empty().append($("<option value=\"Test\">Test</option>"))

            for (file in response.files)
                $("#logfile").append($("<option value=\"" + response.files[file] + "\">" + response.files[file] + "</option>"))
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(thrownError)
        }
    })
}

function connectclick() {
    if (!$("#devbutton").hasClass("disabled") && $("#device")[0].value) {
    $("#devbutton").addClass("disabled")
    if (devbuttonstate == 0) {
        $("#devbutton").attr("value","Connecting...")
        $.ajax("/start", {
            data : JSON.stringify({"device": $("#device")[0].value}),
            contentType : 'application/json',
            type : 'POST',
            success: goconnected,
            error: function(xhr, ajaxOptions, thrownError) {
                console.log(thrownError)
            }
        })           
    } else if (devbuttonstate == 1) {
        $("#devbutton").attr("value","Disconnecting...")
        $.ajax("/stopread", {
        type : 'GET',
        success: godisconnected,
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(thrownError)
        }
        })
    }
    $(".dropdown").removeClass("show").find(".active").removeClass("active")
    }
}

function loadclick() {
    if (!$("#logbutton").hasClass("disabled")) {
        $("#logbutton").addClass("disabled")
        if ($("#logfile")[0].value) {
            $.ajax("/loadlog", {
            data : JSON.stringify({"logfile": $("#logfile")[0].value}),
            contentType : 'application/json',
            type : 'POST',
            success: function(response) {
                cleardata()
                for (r in response)
                    adddata(response[r][0],response[r][1])
                $("#logbutton").removeClass("disabled")
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log(thrownError)
            }
            })     
        }
        $(".dropdown").removeClass("show").find(".active").removeClass("active")
    }
}

$( document ).ready(function() {
    loaddevs()
    getfiles()
    const ctx = document.getElementById('myChart');
    Chart.register(DrainAxis);
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{data: []}]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {display: false}
            },
            scales: {
                x: {
                    display: false,
                    type: "time",
                    parsing: false
                },
                y: {
                    beginAtZero: true,
                    type: "Drain"
                }
            },
            onClick: function(evt,elements,chart) {
                try {
                    scrollTableTo($("#" + chart.data.datasets[elements[0].datasetIndex].data[elements[0].index].x.toString().replace(".",""))[0],"#datatable")
                } catch {
                    
                }
            }
        }
    })
    updatechart()
    $(".tablesorter").tablesorter({sortList: [[0,0]]});
});

function startserver() {
    if (!!window.EventSource) {        
        var source = new EventSource('/stream');
        source.onmessage = function(e) {   
            try {
                edata = JSON.parse(e.data) 
                if (edata.type == "data") {
                    $("#reading-now").text(edata.value + "ma")
                    adddata(edata.time,edata.value)
                } else if (edata.type == "disconnected" && devbuttonstate == 1)
                    godisconnected()
                else if (edata.type == "filesupdated")
                    getfiles()
            } catch (error) {
                console.log(error)
            }            
        }
        source.onerror = function(e) {
            console.log(e)
        }
    }
}
startserver()