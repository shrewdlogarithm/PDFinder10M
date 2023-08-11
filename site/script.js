var chart

var devbuttonstate = 0

var chartdata = []
var minval = 99999
var maxval = 0

// const highlighted = function (ctx, value) {
// var hlvalue = -1
//     return ctx.p1DataIndex == hlvalue-1 ? value : undefined
// };

function toggleDarkMode() {
    halfmoon.toggleDarkMode()
}

function cleardata() {
    minval = 99999
    maxval = 0
    chartdata = []      
    chart.data.datasets[0].data = chartdata        
    chart.update()
    $("table tbody").empty()
}

function goconnected() {
    $("#devbutton").removeClass("disabled").attr("value","Disconnect from Device")
    $("#logbutton").addClass("disabled")
    devbuttonstate = 1
}

function godisconnected() {
    $("#connect").removeClass("btn-success").addClass("btn-danger").text("Connect/Load")
    $("#devbutton").removeClass("disabled").attr("value","Connect to Device")
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
    // Data decimation - we remove repeating values once we have at least 3
    if (chartdata.length > 2 && sameas(chartdata[chartdata.length-1].y,val) && sameas(chartdata[chartdata.length-1].y,chartdata[chartdata.length-2].y)) {
        chartdata.pop()
        $("table tr:last").remove()
    } 
    
    timenow = new Date(tim)
    $row = $("<tr><td><span>" + String(timenow.getMonth()+1) + "/" + timenow.getDate() + " " + timenow.getHours() + ":" + String(timenow.getMinutes()).padStart(2,"0") + ":" + String(timenow.getSeconds()).padStart(2,"0") + "</span></td><td class=\"readingvalue\">" + val + "</td></tr>")
    $('table')
    .find('tbody').append($row)
    // .trigger('addRows', [$row, false]);        
    $row.click(clickrow)
    $row.attr("id","DP" + chartdata.length)
    $row.data("datapoint",chartdata.length)

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
    var elemTop = $(element)[0].offsetTop
    var elemBottom = elemTop + $(element).height(); 
    if (elemTop < containerTop) {
        $(container).scrollTop(elemTop);
    } else if (elemBottom > containerBottom) {
        $(container).scrollTop(elemBottom - $(container).height() + 50);
    }
}

function clickrow(e) {
    const tooltip = chart.tooltip;
    const chartArea = chart.chartArea;
        $(".highlightrow").removeClass("highlightrow")
    $(e.currentTarget).addClass("highlightrow")
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
    // hlvalue = $(e.currentTarget).data("datapoint")
    chart.update()
}

function loaddata(response,ct) {
    if (ct == 0) {
        $("table").hide()       
        $("#progbar").show()
        $(".progress-bar").attr('style', "width: " + "0% !important")    
    }
    for (var i = 0; i < response.length/50 ; i++) {
        if (ct < response.length) {
            adddata(response[ct][0],response[ct][1])
            ct++
        } 
    }
    $(".progress-bar").attr('style', "width: " + Math.round(ct/(response.length/100),0) + "% !important")
    $(".progress-bar").text(Math.round(ct/(response.length/100),0) + "%")
    if (ct < response.length) {
        setTimeout(function () {
            loaddata(response,ct)
        })
    } else {
        $("#logbutton").removeClass("disabled")
        $("#progbar").hide()
        $("table").show()
        chartdirty = true
    }
}

function loaddevs() {
    $.ajax("/loaddevs", {
        contentType : 'application/json',
        type : 'GET',
        success: function(response) {
            $("#device").empty()
            for (dev in response.ble) {
                test = response.ble[dev].name == response.active?"SELECTED":""
                $("#device").append($("<option " + test + " value=\"ble:" + response.ble[dev].name + "\">Bluetooth: " + response.ble[dev].name + "</option>"))
            }
            for (dev in response.com) {
                test = response.com[dev].port == response.active?"SELECTED":""
                $("#device").append($("<option " + test + " value=\"com:" + response.com[dev].port + "\">Serial Port: " + response.com[dev].name + "</option>"))            
            }
            if (response.active) {
                addlogmsg("Reconnected to " + response.active)
                $.ajax("/loadlog", {
                    data : JSON.stringify({"portname": $("#device")[0].value}),
                    contentType : 'application/json',
                    type : 'POST',
                    success: function(response) {
                        goconnected()
                        $("#progbar").show()
                        setTimeout(function() {
                            loaddata(response,0)
                        })        
                        $("#connect").removeClass("btn-danger").addClass("btn-success").text("Connected")                        
                    },
                    error: function(xhr, ajaxOptions, thrownError) {
                        console.log(thrownError)
                    }
                })            
            } 
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
    $("#connect").text("Connecting...")
    if (!$("#devbutton").hasClass("disabled") && $("#device")[0].value) {
    $("#devbutton").addClass("disabled")
    if (devbuttonstate == 0) {
        $("#devbutton").attr("value","Connecting...")
        cleardata()
        $.ajax("/startread", {
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
            cleardata()
            $.ajax("/loadlog", {
                data : JSON.stringify({"logfile": $("#logfile")[0].value}),
                contentType : 'application/json',
                type : 'POST',
                success: function(response) {
                    setTimeout(function() {
                        loaddata(response,0)
                    })
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
            datasets: [{
                data: [],
                // segment: {
                //     borderColor: ctx => highlighted(ctx, "rgb(255,0,0)")
                // }
            }]
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
                    scrollTableTo($("#DP" + elements[0].index)[0],"#datatable")
                } catch {
                    
                }
                // hlvalue = -1
                // chart.update()
            }
        }
    })
    updatechart()
    // $(".tablesorter").tablesorter({sortList: [[0,0]]});
});

function addlogmsg(msg) {
    timenow = new Date()
    $(".logs").prepend($("<div></div>").text(timenow.getHours() + ":" + timenow.getMinutes()  + " - " + msg))
}

var checkdisconnect 
function startserver() {
    if (!!window.EventSource) {        
        var source = new EventSource('/stream');
        source.onmessage = function(e) {   
            try {
                if (checkdisconnect)
                    clearTimeout(checkdisconnect)
                checkdisconnect = setTimeout(function() {
                    console.log("NO MESSAGE RECIEVED FOR 10 SECONDS")
                },10000)                    
                edata = JSON.parse(e.data) 
                if (edata.type == "data") {
                    $("#reading-now").text(edata.value + "ma")
                    adddata(edata.time,edata.value)
                    chartdirty = true
                } else if (edata.type == "connect") {
                    if (!edata.status) {
                        if (checkdisconnect)
                            clearTimeout(checkdisconnect)
                        godisconnected()
                    } else if (edata.status) {
                        $("#connect").removeClass("btn-danger").addClass("btn-success").text("Connected")
                    }
                } else if (edata.type == "filesupdated")
                    getfiles()
                else if (edata.type == "log") {
                    addlogmsg(edata.value)
                }
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