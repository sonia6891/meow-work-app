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
    let numericObservations: [ObservationOut]
    let labelObservations: [ObservationOut]
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

func recognize(_ cg: CGImage, languages: [String], minimumTextHeight: Float, languageCorrection: Bool = false, customWords: [String] = [], candidateLimit: Int = 1) throws -> [ObservationOut] {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = languageCorrection
    req.recognitionLanguages = languages
    req.minimumTextHeight = minimumTextHeight
    if !customWords.isEmpty { req.customWords = customWords }
    let handler = VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:])
    try handler.perform([req])
    let w = Double(cg.width), h = Double(cg.height)
    var out: [ObservationOut] = []
    for obs in req.results ?? [] {
        let b = obs.boundingBox
        let x0 = Double(b.minX) * w
        let x1 = Double(b.maxX) * w
        let y0 = (1.0 - Double(b.maxY)) * h
        let y1 = (1.0 - Double(b.minY)) * h
        var seen = Set<String>()
        for cand in obs.topCandidates(max(1, candidateLimit)) {
            let text = cand.string.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty, seen.insert(text).inserted else { continue }
            out.append(ObservationOut(text: text, confidence: cand.confidence, bbox: [x0,y0,x1,y1]))
        }
    }
    return out
}

func pureDigitText(_ text: String) -> String {
    let compact = text.filter { !$0.isWhitespace }
    guard !compact.isEmpty,
          compact.allSatisfy({ $0.isNumber || $0 == "," }) else { return "" }
    return compact.replacingOccurrences(of: ",", with: "")
}

func stitchedDigitCandidates(_ obs: [ObservationOut]) -> [String] {
    let numeric = obs.compactMap { o -> (ObservationOut, String)? in
        let d = pureDigitText(o.text)
        return d.isEmpty ? nil : (o, d)
    }.sorted {
        if abs($0.0.bbox[1] - $1.0.bbox[1]) > 8 { return $0.0.bbox[1] < $1.0.bbox[1] }
        return $0.0.bbox[0] < $1.0.bbox[0]
    }
    var out: [String] = []
    guard numeric.count > 1 else { return out }
    for i in 0..<(numeric.count - 1) {
        var combined = numeric[i].1
        var box = numeric[i].0.bbox
        for j in (i + 1)..<min(numeric.count, i + 3) {
            let next = numeric[j]
            let h1 = max(1.0, box[3] - box[1]), h2 = max(1.0, next.0.bbox[3] - next.0.bbox[1])
            let overlapY = max(0.0, min(box[3], next.0.bbox[3]) - max(box[1], next.0.bbox[1]))
            let avgH = (h1 + h2) / 2.0
            let gap = next.0.bbox[0] - box[2]
            if overlapY < min(h1, h2) * 0.55 || gap < -avgH * 0.18 || gap > max(10.0, avgH * 0.72) { break }
            combined += next.1
            if combined.count > 8 { break }
            out.append(combined)
            box = [min(box[0],next.0.bbox[0]),min(box[1],next.0.bbox[1]),max(box[2],next.0.bbox[2]),max(box[3],next.0.bbox[3])]
        }
    }
    return out
}

func recognizeDigits(_ path: String) -> [String: AnyCodable] {
    guard let cg = loadCGImage(path) else {
        return ["text": AnyCodable(""), "confidence": AnyCodable(0.0)]
    }
    do {
        let primary = try recognize(cg, languages: ["en-US"], minimumTextHeight: 0.006, candidateLimit: 3)
        let fine = try recognize(cg, languages: ["en-US"], minimumTextHeight: 0.0015, candidateLimit: 3)
        let obs = primary + fine
        let stitched = stitchedDigitCandidates(obs)
        let text = (obs.map(\.text) + stitched).joined(separator: " ")
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

let payrollWords = [
    "底薪","本薪","基本薪資","基本工資","輪班津貼","夜班津貼","班別加給","大夜津貼",
    "伙食津貼","餐費補助","伙食補助","膳食補助","表現津貼","績效獎金","績效津貼","工作獎金",
    "交通津貼","通勤補助","加班費","延長工時工資","免稅加班費","勞保費","勞工保險費",
    "健保費","全民健保費","健康保險費","福利金","職工福利金","勞退自提","退休金自提",
    "考勤扣款","請假扣款","缺勤扣款","所得稅","薪資所得稅","扣繳稅額","健保補扣","補充保費",
    "實發金額","實領金額","實領薪資","實領工資","實領合計","實發合計","本期實發","本期實領","實付金額","實付薪資","實付額","淨薪","轉帳金額","銀行入帳","匯款金額","應付淨額","應領淨額","應領金額","實際入帳","薪資入帳","NET PAY","TAKE HOME","淨額","入帳金額","工會費","停車費","團保費","代扣款","宿舍費",
    "制服費","專案獎金","特殊津貼","職務加給","誤餐費"
]

var processed = 0
for line in data.split(separator: "\n") {
    guard let raw = line.data(using: .utf8),
          let obj = try JSONSerialization.jsonObject(with: raw) as? [String: Any],
          let id = obj["id"] as? Int,
          let split = obj["split"] as? String,
          let imagePath = obj["image"] as? String,
          let cg = loadCGImage(imagePath) else { continue }
    let observations: [ObservationOut]
    let numericObservations: [ObservationOut]
    let labelObservations: [ObservationOut]
    do {
        observations = try recognize(cg, languages: ["zh-Hant","en-US"], minimumTextHeight: 0.0025)
        numericObservations = try recognize(cg, languages: ["en-US"], minimumTextHeight: 0.0015, candidateLimit: 3)
        labelObservations = try recognize(cg, languages: ["zh-Hant","en-US"], minimumTextHeight: 0.0025, languageCorrection: true, customWords: payrollWords)
    } catch {
        continue
    }
    var digitCrops: [String:[String:AnyCodable]] = [:]
    if let crops = obj["critical_crops"] as? [String:String] {
        for (key,path) in crops { digitCrops[key] = recognizeDigits(path) }
    }
    let result = CaseOut(id:id, split:split, observations:observations, numericObservations:numericObservations, labelObservations:labelObservations, digitCrops:digitCrops)
    let enc = try encoder.encode(result)
    handle.write(enc); handle.write(Data([0x0A]))
    processed += 1
    if processed % 100 == 0 { fputs("processed \(processed)\n", stderr) }
}
fputs("completed \(processed)\n", stderr)
