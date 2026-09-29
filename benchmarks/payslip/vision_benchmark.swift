import Foundation
import Vision
import AppKit

struct ObservationOut: Codable {
    let text: String
    let confidence: Float
    let bbox: [Double]
}
struct CaseOut: Codable {
    let id: Int
    let split: String
    let observations: [ObservationOut]
    let digitCrops: [String: [String: AnyCodable]]
}

struct AnyCodable: Codable {
    let value: Any
    init(_ value: Any) { self.value = value }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch value {
        case let v as String: try c.encode(v)
        case let v as Double: try c.encode(v)
        case let v as Float: try c.encode(Double(v))
        case let v as Int: try c.encode(v)
        case is NSNull: try c.encodeNil()
        default: try c.encode(String(describing: value))
        }
    }
    init(from decoder: Decoder) throws { self.value = NSNull() }
}

func arg(_ name: String) -> String? {
    guard let i = CommandLine.arguments.firstIndex(of: name), i + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[i + 1]
}

func loadCGImage(_ path: String) -> CGImage? {
    guard let image = NSImage(contentsOfFile: path) else { return nil }
    var rect = CGRect(origin: .zero, size: image.size)
    return image.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func recognize(_ cg: CGImage, languages: [String], minimumTextHeight: Float) throws -> [ObservationOut] {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.recognitionLanguages = languages
    req.minimumTextHeight = minimumTextHeight
    let handler = VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:])
    try handler.perform([req])
    let w = Double(cg.width), h = Double(cg.height)
    return (req.results ?? []).compactMap { obs in
        guard let cand = obs.topCandidates(1).first else { return nil }
        let b = obs.boundingBox
        let x0 = Double(b.minX) * w
        let x1 = Double(b.maxX) * w
        let y0 = (1.0 - Double(b.maxY)) * h
        let y1 = (1.0 - Double(b.minY)) * h
        return ObservationOut(text: cand.string, confidence: cand.confidence, bbox: [x0,y0,x1,y1])
    }
}

func recognizeDigits(_ path: String) -> [String: AnyCodable] {
    guard let cg = loadCGImage(path) else {
        return ["text": AnyCodable(""), "confidence": AnyCodable(0.0)]
    }
    do {
        let obs = try recognize(cg, languages: ["en-US"], minimumTextHeight: 0.01)
        let text = obs.map(\.text).joined(separator: " ")
        let conf = obs.map { Double($0.confidence) }.max() ?? 0.0
        return ["text": AnyCodable(text), "confidence": AnyCodable(conf)]
    } catch {
        return ["text": AnyCodable(""), "confidence": AnyCodable(0.0)]
    }
}

guard let manifestPath = arg("--manifest"), let outPath = arg("--out") else {
    fputs("usage: vision_benchmark --manifest manifest.jsonl --out vision.jsonl\n", stderr)
    exit(2)
}

let data = try String(contentsOfFile: manifestPath, encoding: .utf8)
FileManager.default.createFile(atPath: outPath, contents: nil)
guard let handle = FileHandle(forWritingAtPath: outPath) else { exit(3) }
defer { try? handle.close() }
let encoder = JSONEncoder()

var processed = 0
for line in data.split(separator: "\n") {
    guard let raw = line.data(using: .utf8),
          let obj = try JSONSerialization.jsonObject(with: raw) as? [String: Any],
          let id = obj["id"] as? Int,
          let split = obj["split"] as? String,
          let imagePath = obj["image"] as? String,
          let cg = loadCGImage(imagePath) else { continue }
    let observations: [ObservationOut]
    do {
        observations = try recognize(cg, languages: ["zh-Hant","en-US"], minimumTextHeight: 0.0025)
    } catch {
        continue
    }
    var digitCrops: [String:[String:AnyCodable]] = [:]
    if let crops = obj["critical_crops"] as? [String:String] {
        for (key,path) in crops { digitCrops[key] = recognizeDigits(path) }
    }
    let result = CaseOut(id:id, split:split, observations:observations, digitCrops:digitCrops)
    let enc = try encoder.encode(result)
    handle.write(enc); handle.write(Data([0x0A]))
    processed += 1
    if processed % 100 == 0 { fputs("processed \(processed)\n", stderr) }
}
fputs("completed \(processed)\n", stderr)
