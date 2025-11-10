from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shapely.geometry import shape, mapping, Point
import geojson
import random

app = FastAPI(title="PlanWise API")

# ✅ Allow specific origins for security
origins = [
    "http://localhost:5173",  # Local dev with Vite
    "http://localhost:5174",  # Sometimes Vite uses a different port
    "https://planwise-frontend.vercel.app",  # Production frontend on Vercel
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # allow these domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "PlanWise API is running!"}

@app.post("/generate")
def generate_plan(payload: dict):
    site = payload.get("site_geojson")
    density = payload.get("density_category", "Medium")
    population = payload.get("target_population", 1000)
    facilities = payload.get("facilities", [])

    geom = shape(site["features"][0]["geometry"])
    centroid = geom.centroid

    # create random points (mock parcels)
    minx, miny, maxx, maxy = geom.bounds
    features = []
    for i in range(30):
        x, y = random.uniform(minx, maxx), random.uniform(miny, maxy)
        p = Point(x, y)
        if geom.contains(p):
            features.append(
                geojson.Feature(geometry=mapping(p), properties={"type": "parcel"})
            )

    # add facilities near centroid
    for f in facilities:
        fx, fy = centroid.x + random.uniform(-0.001, 0.001), centroid.y + random.uniform(-0.001, 0.001)
        pf = Point(fx, fy)
        features.append(
            geojson.Feature(
                geometry=mapping(pf),
                properties={"type": "facility", "name": f},
            )
        )

    return geojson.FeatureCollection(features)
