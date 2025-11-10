import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnNzbWFuIiwiYSI6ImNtaGowdWJqajBtbWEybXM4c2oybDNna3QifQ.j6Fjx-lltlRotKfB6UFwYg"; // put your real token here
const API_BASE = process.env.REACT_APP_API_URL; // ✅ use environment variable

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [targetPopulation, setTargetPopulation] = useState(1000);
  const [density, setDensity] = useState("Medium");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize map and draw tools
  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [7.41, 9.08],
      zoom: 12,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });

    map.addControl(draw);
    mapRef.current = map;
    drawRef.current = draw;

    // cleanup on unmount
    return () => map.remove();
  }, []);

  // Generate layout plan
  async function generatePlan() {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;

    const data = draw.getAll();
    if (!data || data.features.length === 0) {
      alert("Please draw a polygon first!");
      return;
    }

    const payload = {
      project_name: "Demo Town",
      site_geojson: data,
      target_population: targetPopulation,
      density_category: density,
      facilities: ["Church", "School", "Market"],
    };

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/generate`, payload);
      setPreview(res.data);
      alert("✅ Plan generated successfully!");

      // Remove old preview layer if it exists
      if (map.getSource("preview")) {
        if (map.getLayer("preview-points")) map.removeLayer("preview-points");
        map.removeSource("preview");
      }

      // Add new preview layer
      map.addSource("preview", { type: "geojson", data: res.data });
      map.addLayer({
        id: "preview-points",
        type: "circle",
        source: "preview",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ff0000",
        },
      });
    } catch (err) {
      console.error(err);
      alert(
        "❌ Failed to connect to backend. Make sure FastAPI is running and CORS is configured."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Map section */}
      <div ref={mapContainer} style={{ flex: 3, height: "100%" }} />

      {/* Control panel */}
      <div
        style={{
          flex: 1,
          padding: 16,
          background: "#fafafa",
          borderLeft: "1px solid #ccc",
          overflowY: "auto",
        }}
      >
        <h3>PlanWise.AI</h3>
        <p>Generate AI-based town layout</p>

        <label>Target Population</label>
        <input
          type="number"
          value={targetPopulation}
          onChange={(e) =>
            setTargetPopulation(parseInt(e.target.value || 0))
          }
          style={{ width: "100%", marginBottom: 10 }}
        />

        <label>Density</label>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <button
          onClick={generatePlan}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "#0078ff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Generating..." : "Generate Plan"}
        </button>

        {preview && (
          <div
            style={{
              marginTop: 15,
              maxHeight: 200,
              overflow: "auto",
              background: "#eee",
              padding: 8,
              borderRadius: 5,
              fontSize: "0.8em",
            }}
          >
            <h4>Generated Layout (GeoJSON)</h4>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
