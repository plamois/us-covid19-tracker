//function to add thousands separator
function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}
//function to format date from yyyymmdd to yyyy-mm-dd
function formatDate(num) {
    return num.toString().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
}

/* API DATA REQUESTS */
var covid = $.ajax({
    url: "https://api.covidtracking.com/v1/states/current.json",
    dataType: "json",
    success: console.log("State health data successfully loaded."),
    error: function(xhr) {
        alert(`State api ${xhr.statusText}`);
    }
});

var covidTotal = $.ajax({
    url: "https://api.covidtracking.com/v1/us/current.json",
    dataType: "json",
    success: console.log("USA health data successfully loaded."),
    error: function(xhr) {
        alert(`USA api ${xhr.statusText}`);
    }
});

$.when(covid, covidTotal).done(function() {
    statesData.features.forEach(function(element) {
        covid.responseJSON.find(function(newElement) {
            if (element.properties.STATEFP == newElement.fips) {
                element.properties.positive = newElement.positive;
                element.properties.negative = newElement.negative;
                element.properties.totalTestResults = newElement.total;
                element.properties.death = newElement.death;
                element.properties.recovered = newElement.recovered;
                element.properties.onVentilatorCurrently = newElement.onVentilatorCurrently;
            }
        });
    });

    var map = L.map('map', { zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5 }).setView([39.8, -98.5], 4);

    L.tileLayer('', {
        attribution: ' By <a href="https://www.peterlamois.com" target="_blank">Peter LaMois</a> | Data: <a href="https://covidtracking.com" target="_blank">The COVID Tracking Project</a>'
    }).addTo(map);

    //detailed state information
    var info = L.control();

    info.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
    };

    info.update = function(props) {
        this._div.innerHTML = '<h4>U.S. COVID-19 Tracker</h4>' + (props ?
            '<b>' + props.NAME + '</br>' + 'Total Cases: </b>' + formatNumber(props.positive) + '</br>' + '<b>Cases/100K: </b>' + formatNumber(((props.positive) / (props.POP) * 100000).toFixed(0)) + '</br>' + '<b>Deaths/100K: </b>' + formatNumber(((props.death) / (props.POP) * 100000).toFixed(0)) :
            'Select a state for details');
    };

    info.addTo(map);

    //style and interaction settings
    function getColor(d) {
        return d > 10000 ? '#990000' :
            d > 8000 ? '#d7301f' :
            d > 6000 ? '#ef6548' :
            d > 4000 ? '#fc8d59' :
            d > 2000 ? '#fdbb84' :
            d > 1000 ? '#fdd49e' :
            '#fef0d9';
    }

    function style(feature) {
        return {
            weight: 1,
            opacity: 1,
            color: 'grey',
            fillOpacity: 0.7,
            fillColor: getColor((feature.properties.positive) / (feature.properties.POP) * 100000)
        };
    }

    var prevLayerClicked = null;

    function onEachFeature(feature, layer) {
        layer.on({
            click: function(e) {
                if (prevLayerClicked !== null) {
                    geojson.resetStyle(prevLayerClicked);
                }

                var layer = e.target;
                layer.setStyle({
                    weight: 2,
                    color: '#666',
                    fillOpacity: 0.7
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }

                info.update(layer.feature.properties);
                prevLayerClicked = layer;
            }
        });
    }

    geojson = L.geoJson(statesData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    //set mapview to fit screen
    var southWest = new L.LatLng(24.89, -124.94),
        northEast = new L.LatLng(49.3, -66.85),
        bounds = new L.LatLngBounds(southWest, northEast);

    map.fitBounds(bounds);

    //add legend
    var legend = L.control({ position: 'bottomright' });

    legend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 1000, 2000, 4000, 6000, 8000, 10000],
            labels = ['Cases per 100,000'],
            from, to;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            labels.push(
                '<i style="background:' + getColor(from + 1) + '"></i> ' +
                from + (to ? '&ndash;' + to : '+'));
        }

        div.innerHTML = labels.join('<br>');
        return div;
    };

    legend.addTo(map);

    //US total stats
    var usData = covidTotal.responseJSON;

    var totalUS = L.control({ position: 'topleft' });

    totalUS.onAdd = function(map) {
        this._div = L.DomUtil.create('div', 'totalUS');
        this._div.innerHTML = '<h2>U.S.A.</h2>' + '</br>' + '<h1>' + formatNumber(usData[0].positive) + '</h1>' + '<h4>Total Cases</h4>' + '<hr></br>' + '<h2>U.S.A.</h2>' + '</br>' + '<h1>' + formatNumber(usData[0].death) + '</br>' + '</h1>' + '<h4>Total Deaths</h4>' + '<hr></br>' + '<h2>U.S.A.</h2>' + '<h1>' + '</br>' + formatNumber(((usData[0].positive / 329877505) * 100000).toFixed(0)) + '</h1>' + '<h4>Cases per 100,000 People</h4>' + '<hr>' + '<p>Updated: ' + formatDate(usData[0].date)
        return this._div;
    };

    totalUS.addTo(map);

});
