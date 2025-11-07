//! TSMultimeter Backend - HTTP Server
//!
//! This is the main entry point for the TSMultimeter backend.
//! It starts an HTTP server that the Electron frontend can communicate with.

use std::sync::Arc;
use tokio::sync::Mutex;
use tsmultimeter_backend::communication::{
    connect_device, disconnect_device, get_available_ports, get_connected_devices, get_measurement,
    AppState,
};
use tsmultimeter_backend::init;
use warp::http::{Method, StatusCode};
use warp::Filter;

#[tokio::main]
async fn main() {
    // Initialize the backend
    if let Err(e) = init() {
        eprintln!("Failed to initialize backend: {}", e);
        std::process::exit(1);
    }

    println!("Starting TSMultimeter Backend HTTP Server on http://localhost:8080");

    let app_state = Arc::new(Mutex::new(AppState::new()));

    // Define routes
    let connect_route = warp::path("connect")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(app_state.clone()))
        .and_then(connect_device_handler);

    let connect_options_route = warp::path("connect")
        .and(warp::options())
        .map(|| warp::reply::with_status(warp::reply(), StatusCode::NO_CONTENT));

    let disconnect_route = warp::path!("disconnect" / String)
        .and(warp::post())
        .and(with_state(app_state.clone()))
        .and_then(disconnect_device_handler);

    let measurement_route = warp::path!("measurement" / String)
        .and(warp::get())
        .and(with_state(app_state.clone()))
        .and_then(get_measurement_handler);

    let status_route = warp::path("status")
        .and(warp::get())
        .and(with_state(app_state.clone()))
        .and_then(get_status_handler);

    let ports_route = warp::path("ports")
        .and(warp::get())
        .and_then(get_ports_handler);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec![
            warp::http::header::CONTENT_TYPE,
            warp::http::header::ACCEPT,
        ]);

    let routes = connect_route
        .or(connect_options_route)
        .or(disconnect_route)
        .or(measurement_route)
        .or(status_route)
        .or(ports_route)
        .with(cors);

    warp::serve(routes).run(([127, 0, 0, 1], 8080)).await;
}

fn with_state(
    state: Arc<Mutex<AppState>>,
) -> impl Filter<Extract = (Arc<Mutex<AppState>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || state.clone())
}

async fn connect_device_handler(
    body: serde_json::Value,
    state: Arc<Mutex<AppState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    println!("Incoming connect request: {}", body);
    let device_type_str = body
        .get("device_type")
        .and_then(|v| v.as_str())
        .unwrap_or("Mock");
    let port = body.get("port").and_then(|v| v.as_str());

    match connect_device(
        device_type_str.to_string(),
        port.map(|s| s.to_string()),
        &state,
    )
    .await
    {
        Ok(device) => {
            println!(
                "Connected device {} of type {:?}",
                device.id, device.device_type
            );
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "device": device,
            })))
        }
        Err(e) => {
            println!("Failed to connect device: {}", e);
            Ok(warp::reply::json(
                &serde_json::json!({"success": false, "error": e}),
            ))
        }
    }
}

async fn disconnect_device_handler(
    device_id: String,
    state: Arc<Mutex<AppState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match disconnect_device(device_id.clone(), &state).await {
        Ok(message) => Ok(warp::reply::json(
            &serde_json::json!({"success": true, "message": message}),
        )),
        Err(e) => Ok(warp::reply::json(
            &serde_json::json!({"success": false, "error": e}),
        )),
    }
}

async fn get_measurement_handler(
    device_id: String,
    state: Arc<Mutex<AppState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match get_measurement(device_id, &state).await {
        Ok(data) => Ok(warp::reply::json(
            &serde_json::json!({"success": true, "data": data}),
        )),
        Err(e) => Ok(warp::reply::json(
            &serde_json::json!({"success": false, "error": e}),
        )),
    }
}

async fn get_status_handler(
    state: Arc<Mutex<AppState>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match get_connected_devices(&state).await {
        Ok(devices) => Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "devices": devices,
        }))),
        Err(e) => Ok(warp::reply::json(
            &serde_json::json!({"success": false, "error": e}),
        )),
    }
}

async fn get_ports_handler() -> Result<impl warp::Reply, warp::Rejection> {
    match get_available_ports() {
        Ok(ports) => Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "ports": ports,
        }))),
        Err(e) => Ok(warp::reply::json(
            &serde_json::json!({"success": false, "error": e}),
        )),
    }
}
