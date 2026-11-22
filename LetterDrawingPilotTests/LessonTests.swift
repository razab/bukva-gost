import UIKit
import WebKit
import XCTest
import SQLite3

final class LessonTests: XCTestCase {
    private let field = "document.querySelector('canvas[aria-label=\"Буква А, проба 1\"]')"

    @MainActor
    func testLetterSwitchPerformance() async throws {
        let web = try await loadedLesson(requireA: false)
        let report = try await web.evaluateJavaScript("""
            (()=>{
                const timings=[],original=activeLetter,phases={};
                const wrap=(object,key)=>{const fn=object[key];object[key]=function(...args){const start=performance.now();try{return fn.apply(this,args)}finally{phases[key]=(phases[key]||0)+performance.now()-start}};return ()=>object[key]=fn};
                const restore=[wrap(LearnerExperience,'renderOverview'),wrap(WritingScheme,'markup'),wrap(LetterSequence,'mount')];
                for(const letter of ['Я','М','И','А','Я','М','И','А']){
                    Object.keys(phases).forEach(k=>phases[k]=0);const start=performance.now();build(variant,letter);
                    timings.push({letter,ms:performance.now()-start,...phases});
                }
                restore.forEach(fn=>fn());build(variant,original);return JSON.stringify(timings);
            })()
            """) as? String
        let attachment = XCTAttachment(string: report ?? "missing")
        attachment.name = "letter-switch-timings"; attachment.lifetime = .keepAlways; add(attachment)
        print("LETTER_SWITCH_TIMINGS: " + (report ?? "missing"))
        let samples = try JSONSerialization.jsonObject(with: Data(try XCTUnwrap(report).utf8)) as? [[String: Any]]
        XCTAssertLessThanOrEqual(samples?.compactMap { $0["ms"] as? Double }.max() ?? .infinity, 150)
    }

    @MainActor
    func testDirectionFeedback() async throws {
        let web = try await loadedLesson(requireA: false)
        let result = try await web.evaluateJavaScript("""
            (()=>{
                build(variant,'А');
                const outcomes=[],[left,right,bar]=demonstrationFor(models);
                for(const [index,reverse] of [false,true].entries()){
                    const canvas=document.querySelector(`[data-surface-id="gost-file-b90-upper-${index}"]`),cell=canvas.closest('.cell'),score=cell.querySelector('.score');
                    if(!score.disabled){score.click();cell.querySelector('.reset').click()}
                    canvas.scrollIntoView({block:'center'});canvas.setPointerCapture=()=>{};
                    const frame=JSON.parse(canvas.dataset.viewBox),rect=canvas.getBoundingClientRect();
                    const scale=rect.width/frame.width,[[x0,y],[x1]]=bar;
                    const crossbar=reverse?[...bar].reverse():[[x0,y],[x0+10/scale,y],[x0+2/scale,y],[x1,y]];
                    for(const route of [left,right,crossbar]){
                        for(let i=0;i<route.length;i++){
                            const [x,y]=route[i];canvas.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===route.length-1?'pointerup':'pointermove',{bubbles:true,cancelable:true,pointerType:'pen',pointerId:1,isPrimary:true,clientX:rect.left+(x-frame.x)/frame.width*rect.width,clientY:rect.top+(y-frame.y)/frame.height*rect.height}));
                        }
                    }
                    outcomes.push({score:parseInt(score.textContent),backward:score.dataset.direction==='backward'});
                }
                return outcomes;
            })()
            """) as? [[String: Any]]
        XCTAssertEqual(result?.first?["score"] as? Int, 100)
        XCTAssertEqual(result?.first?["backward"] as? Bool, false)
        XCTAssertEqual(result?.last?["backward"] as? Bool, true)
        XCTAssertLessThan(result?.last?["score"] as? Int ?? 100, 90)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "short-correction-and-reversed-crossbar"; attachment.lifetime = .keepAlways; add(attachment)
        _ = try await web.evaluateJavaScript("reset('gost-file-b90-upper-1');refresh()")
    }

    @MainActor
    func testAdditionalExercisesUseCurrentMovements() async throws {
        let web = try await loadedLesson(requireA: false)
        let report = try await web.callAsyncJavaScript("""
            await NativeApp.command('option',{key:'additional',enabled:true});
            build(variant,'Б');
            const details=document.querySelector('#additional-practice');
            details.open=true;
            details.scrollIntoView({block:'start'});
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            return {
                optionalParts:details.querySelectorAll('[data-lesson-stage$="-elements"]').length,
                optionalTexts:details.querySelectorAll('[data-component="letter-sequence"]').length,
                primaryLoop:!!document.querySelector('[data-component="gost-b90-431-part-8"]'),
                wholeLetter:DrawingGlyphs.б.demonstration.length,
                heading:details.querySelector('summary').textContent
            };
            """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        XCTAssertEqual(report?["optionalParts"] as? Int, 0)
        XCTAssertGreaterThan(report?["optionalTexts"] as? Int ?? 0, 0)
        XCTAssertEqual(report?["primaryLoop"] as? Bool, true)
        XCTAssertEqual(report?["wholeLetter"] as? Int, 1)
        XCTAssertEqual(report?["heading"] as? String, "Ещё упражнения")
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "additional-exercises-be"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    func testRepeatCountKeepsScoresWithVisibleInk() async throws {
        let mounted = try await loadedLesson(requireA: false)
        let url = try XCTUnwrap(mounted.url)
        let host = try XCTUnwrap(mounted.superview)
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        let web = WKWebView(frame: mounted.frame, configuration: config)
        host.addSubview(web)
        defer { web.removeFromSuperview() }
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        for _ in 0..<80 {
            if (try? await web.evaluateJavaScript("typeof NativeApp === 'object'") as? Bool) == true { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let report = try await web.callAsyncJavaScript("""
            await NativeApp.command('select',{letter:'Б'});
            await NativeApp.command('style',{index:4});
            const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            const repeats=async count=>{
                await NativeApp.command('configure',{practiceRepeats:count});
                await frame();
            };
            const fields=stage=>[...document.querySelectorAll(`[data-lesson-stage="${stage}"] .cell`)];
            const state=cell=>{
                const canvas=cell.querySelector('canvas'),score=cell.querySelector('.score');
                const {x,y,width,height}=canvas.getBoundingClientRect();
                return {score:score.textContent,disabled:score.disabled,rect:[x,y,width,height]};
            };
            await repeats(3);
            const untouched=fields('upper-letter').map(state);
            const lowerId='gost-file-b90-lower-0';
            data[lowerId]=DrawingGlyphs.б.demonstration.map(path=>path.map(([x,y])=>[x/150,y/180]));
            save();
            refresh([lowerId]);
            await repeats(5);
            window.scrollTo(0,0);
            // Reproduce a missing canvas layer without touching any scored field.
            for(const canvas of document.querySelectorAll('#practice canvas'))canvas.style.setProperty('opacity','0','important');
            await frame();
            return {untouched,upper:fields('upper-letter').map(state),lower:fields('lower-letter').map(state)};
            """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        let untouched = try XCTUnwrap(report?["untouched"] as? [[String: Any]])
        let upper = try XCTUnwrap(report?["upper"] as? [[String: Any]])
        let lower = try XCTUnwrap(report?["lower"] as? [[String: Any]])
        XCTAssertEqual(untouched.count, 3)
        XCTAssertEqual(upper.count, 5)
        XCTAssertEqual(lower.count, 5)
        XCTAssertEqual(lower.first?["score"] as? String, "100%")
        XCTAssertEqual(lower.first?["disabled"] as? Bool, false)
        for blank in untouched + upper + Array(lower.dropFirst()) {
            XCTAssertEqual(blank["score"] as? String, "—")
            XCTAssertEqual(blank["disabled"] as? Bool, true)
        }
        for (index, cell) in lower.enumerated() {
            let rect = try XCTUnwrap(cell["rect"] as? [Double])
            XCTAssertEqual(rect.count, 4)
            let config = WKSnapshotConfiguration()
            config.rect = CGRect(x: rect[0], y: rect[1], width: rect[2], height: rect[3])
            let image = try await web.takeSnapshot(configuration: config)
            XCTAssertEqual(try hasBlueInk(image), index == 0, "Visible ink in lowercase field \(index + 1)")
        }
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "repeats-empty-and-drawn"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func hasBlueInk(_ image: UIImage) throws -> Bool {
        let source = try XCTUnwrap(image.cgImage)
        let pixelCount = source.width * source.height
        var rgba = [UInt8](repeating: 0, count: pixelCount * 4)
        return try rgba.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) -> Bool in
            let context = try XCTUnwrap(CGContext(
                data: bytes.baseAddress, width: source.width, height: source.height,
                bitsPerComponent: 8, bytesPerRow: source.width * 4,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            ))
            context.draw(source, in: CGRect(x: 0, y: 0, width: source.width, height: source.height))
            for i in stride(from: 0, to: bytes.count, by: 4) {
                let red = Int(bytes[i])
                let green = Int(bytes[i + 1])
                let blue = Int(bytes[i + 2])
                if blue > red + 45 && blue > green + 25 { return true }
            }
            return false
        }
    }

    @MainActor
    func testConnectedAuditRoutes() async throws {
        let web = try await loadedLesson(requireA: false)
        let report = try await web.callAsyncJavaScript("""
            await NativeApp.command('option',{key:'schemes',enabled:true});
            LearnerExperience.setLevel('precise');
            build(variant,'Э');
            const id='gost-file-b90-lower-0';
            const [body,bar]=DrawingGlyphs.э.demonstration;
            const scores=[bar,[...bar].reverse()].map(line=>{
                data[id]=[body,line].map(path=>path.map(([x,y])=>[x/150,y/180]));
                refresh([id]);
                return surfaces.find(s=>s.id===id).assessment().score;
            });
            LearnerExperience.setLevel('standard');
            const rows=[];
            for(const letter of ['Э','О','П']){
                build(variant,letter);
                const glyph=DrawingGlyphs[letter];
                const id='gost-file-b90-upper-0';
                const validate=route=>{
                    data[id]=route.map(line=>line.map(([x,y])=>[x/150,y/180]));
                    refresh([id]);
                    return surfaces.find(s=>s.id===id).assessment().score;
                };
                const route=glyph.demonstration;
                const score=validate(route),oldScore=validate(glyph.instruction.alternateDirection||route);
                validate(route);
                rows.push({score,oldScore,contacts:route.length,
                    middleRight:letter==='Э'&&route[1][0][0]<route[1].at(-1)[0]});
            }
            window.scrollTo(0,0);
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            return {rows,scores};
            """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        let entries = try XCTUnwrap(report?["rows"] as? [[String: Any]])
        let scores = try XCTUnwrap(report?["scores"] as? [Int])
        XCTAssertEqual(scores.count, 2)
        XCTAssertEqual(scores.first, 100)
        XCTAssertLessThan(scores.last ?? 100, 90)
        XCTAssertEqual(entries.compactMap { $0["score"] as? Int }, [100, 100, 100])
        XCTAssertEqual(entries.compactMap { $0["oldScore"] as? Int }, [100, 100, 100])
        XCTAssertEqual(entries.compactMap { $0["contacts"] as? Int }, [2, 1, 2])
        XCTAssertEqual(entries.first?["middleRight"] as? Bool, true)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "connected-pe-scheme"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    func testBeWarmupAndJoinedLowercase() async throws {
        let web = try await loadedLesson(requireA: false)
        let report = try await web.callAsyncJavaScript("""
            await NativeApp.command('option',{key:'schemes',enabled:true});
            build(variant,'Б');
            const warmup=WorksheetCatalog.elements.find(p=>p.letters[0]==='Б');
            const checks=[
                [PracticeElement.key(warmup.id,0),DrawingGlyphs.Б.demonstration],
                ['gost-file-b90-lower-0',DrawingGlyphs.б.demonstration],
                ['gost-file-b90-lower-1',DrawingGlyphs.б.instruction.alternateDirection],
                ['gost-file-b90-lower-2',DrawingGlyphs.б.demonstration.map(line=>[...line].reverse())]
            ];
            const assessed=checks.map(([id,lines])=>{
                data[id]=lines.map(line=>line.map(([x,y])=>[x/150,y/180]));
                refresh([id]);
                const result=surfaces.find(s=>s.id===id).assessment();
                return {score:result.score,backward:result.direction.backwards};
            });
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            return {assessed, steps:DrawingGlyphs.б.demonstration.length, schemeSteps:document.querySelectorAll('#hero-scheme-lower [data-step-number]').length};
            """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        let results = try XCTUnwrap(report?["assessed"] as? [[String: Any]])
        XCTAssertEqual(results[0]["score"] as? Int, 100)
        XCTAssertEqual(results[0]["backward"] as? Bool, false)
        XCTAssertEqual(results[1]["score"] as? Int, 100)
        XCTAssertEqual(results[1]["backward"] as? Bool, false)
        XCTAssertEqual(results[2]["backward"] as? Bool, false)
        XCTAssertEqual(results[3]["backward"] as? Bool, true)
        XCTAssertEqual(report?["steps"] as? Int, 1)
        XCTAssertEqual(report?["schemeSteps"] as? Int, 1)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "be-scheme-and-practice"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    func testJoinedLowercaseA() async throws {
        let web = try await loadedLesson(requireA: false)
        let outcomes = try await web.callAsyncJavaScript("""
            const initialLetter=activeLetter;
            build(variant,'А');
            const [body,stem]=lowercase;
            const persist=save, append=writingTimes.append;
            save=()=>{};
            writingTimes.append=()=>{};
            let results;
            try {
                results=[[[...body,...stem.slice(1)]],[body,stem],[[...stem].reverse()]].map((strokes,i)=>{
                    const id='gost-file-b90-lower-'+i;
                    const canvas=document.querySelector(`[data-surface-id="${id}"]`);
                    const score=canvas.closest('.cell').querySelector('.score');
                    delete data[id];
                    refresh([id]);
                    canvas.setPointerCapture=()=>{};
                    const box=canvas.getBoundingClientRect(), frame=JSON.parse(canvas.dataset.viewBox);
                    for(const line of strokes){
                        const event=(type,[x,y])=>canvas.dispatchEvent(new PointerEvent(type,{
                            bubbles:true,cancelable:true,pointerType:'pen',pointerId:1,isPrimary:true,
                            clientX:box.left+(x-frame.x)/frame.width*box.width,
                            clientY:box.top+(y-frame.y)/frame.height*box.height
                        }));
                        event('pointerdown',line[0]);
                        for(const point of line.slice(1,-1))event('pointermove',point);
                        event('pointerup',line.at(-1));
                    }
                    return [score.textContent,score.dataset.direction];
                });
            } finally {
                save=persist;
                writingTimes.append=append;
            }
            document.querySelector('[data-surface-id="gost-file-b90-lower-0"]').scrollIntoView({block:'center'});
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            return {results,initialLetter};
            """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
        let results = outcomes?["results"] as? [[String]]
        XCTAssertEqual(results?.first, ["100%", "correct"])
        XCTAssertEqual(results?[1], ["100%", "correct"])
        XCTAssertEqual(results?.last?.last, "backward")
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "joined-lowercase-a"
        attachment.lifetime = .keepAlways
        add(attachment)
        _ = try await web.callAsyncJavaScript("build(variant,letter);return true",
            arguments: ["letter": outcomes?["initialLetter"] as? String ?? "А"], in: nil, contentWorld: .page)
    }

    @MainActor
    func testClosedWarmupDirection() async throws {
        let web = try await loadedLesson(requireA: false)
        let outcomes = try await web.evaluateJavaScript("""
            (() => {
                build(variant,'А');
                const part=WorksheetCatalog.elements.find(p=>p.id==='gost-b90-a-body');
                return [false,true].map((reverse,i)=>{
                    const id=PracticeElement.key(part.id,i);
                    const canvas=document.querySelector(`[data-surface-id="${id}"]`);
                    const score=canvas.closest('.cell').querySelector('.score');
                    data[id]=StrokeDirection.route(part.model).map(line=>
                        (reverse?[...line].reverse():line).map(([x,y])=>[x/150,y/180]));
                    refresh([id]);
                    return {score:score.textContent, direction:score.dataset.direction,
                        cue:!!canvas.parentElement.querySelector('.warmup-arrow'),
                        label:getComputedStyle(score,'::after').content};
                });
            })()
            """) as? [[String: Any]]
        XCTAssertEqual(outcomes?.first?["score"] as? String, "100%")
        XCTAssertEqual(outcomes?.first?["direction"] as? String, "correct")
        XCTAssertEqual(outcomes?.last?["direction"] as? String, "backward")
        XCTAssertEqual(outcomes?.last?["cue"] as? Bool, true)
        XCTAssertTrue((outcomes?.last?["label"] as? String)?.contains("Не по стрелке") ?? false)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "closed-warmup-direction"
        attachment.lifetime = .keepAlways
        add(attachment)
        _ = try await web.evaluateJavaScript("build(variant,'А');true")
    }

    @MainActor
    func testNumbersWorksheet() async throws {
        let web = try await loadedLesson()
        let before = try await web.evaluateJavaScript("JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('letter-worksheet-')&&k!=='letter-worksheet-numbers-v1').sort().map(k=>[k,localStorage.getItem(k)])))") as? String
        _ = try await web.evaluateJavaScript("location.hash='#numbers';location.reload()")
        for _ in 0..<100 {
            if !web.isLoading, (try? await web.evaluateJavaScript("typeof NumberPractice!=='undefined'&&NumberPractice.active&&surfaces.length>0")) as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let result = try await web.evaluateJavaScript("""
            (()=>{
                const failures=[];
                if(!NumberPractice.active)return ['numbers did not reload'];
                const oldRepeats=preferences.practiceRepeats;
                configure({practiceRepeats:0});
                if(surfaces.length!==Object.keys(NumberGlyphs).length*2)failures.push('field count');
                const sections=[...document.querySelectorAll('.number-section')];
                if(sections.length!==2||sections[0].querySelector('h2').textContent!=='Цифры'||sections[1].querySelector('h2').textContent!=='Знаки'||sections[0].querySelectorAll('.number-group').length!==10||sections[1].querySelectorAll('.number-group').length!==6)failures.push('sections');
                for(const character of Object.keys(NumberGlyphs)){
                    const canvas=[...document.querySelectorAll('canvas[data-surface-id]')].find(c=>c.getAttribute('aria-label')===`Символ ${character}, проба 1`);
                    const cell=canvas.closest('.cell'),score=cell.querySelector('.score'),reset=cell.querySelector('.reset');
                    if(!score.disabled){score.click();reset.click()}
                    canvas.scrollIntoView({block:'center'});canvas.setPointerCapture=()=>{};
                    const box=canvas.getBoundingClientRect(),frame=JSON.parse(canvas.dataset.viewBox),model=NumberGlyphs[character].model;
                    for(const line of model)for(let i=0;i<line.length;i++){
                        const [x,y]=line[i];canvas.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===line.length-1?'pointerup':'pointermove',{bubbles:true,cancelable:true,pointerType:'pen',pointerId:1,isPrimary:true,clientX:box.left+(x-frame.x)/frame.width*box.width,clientY:box.top+(y-frame.y)/frame.height*box.height}));
                    }
                    if(parseInt(score.textContent)<90||score.disabled)failures.push(character+' score '+score.textContent);
                    if(NumberPractice.selected!==character||!document.querySelector('#number-pencil'))failures.push(character+' demo');
                    const ink=JSON.stringify(data[canvas.dataset.surfaceId]);
                    score.click();reset.click();if(!score.disabled)failures.push(character+' reset');
                    undo();if(JSON.stringify(data[canvas.dataset.surfaceId])!==ink)failures.push(character+' undo');
                }
                const ink=JSON.stringify(data),backup=LocalBackup.parse(LocalBackup.export(localStorage));
                if(!backup.entries[NumberPractice.key])failures.push('backup');
                reflowPage();if(JSON.stringify(data)!==ink)failures.push('reload');
                configure({practiceRepeats:5});if(surfaces.length!==Object.keys(NumberGlyphs).length*5)failures.push('repeat setting');
                configure({practiceRepeats:oldRepeats});
                window.scrollTo({top:0});return failures;
            })()
            """) as? [String]
        XCTAssertEqual(result, [])
        let numericInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        web.reload()
        for _ in 0..<100 {
            if !web.isLoading, (try? await web.evaluateJavaScript("typeof NumberPractice!=='undefined'&&NumberPractice.active&&surfaces.length>0")) as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let reopenedInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        XCTAssertEqual(numericInk, reopenedInk)
        let after = try await web.evaluateJavaScript("JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('letter-worksheet-')&&k!=='letter-worksheet-numbers-v1').sort().map(k=>[k,localStorage.getItem(k)])))") as? String
        XCTAssertEqual(before, after)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "numbers-worksheet"; attachment.lifetime = .keepAlways; add(attachment)
        _ = try await web.evaluateJavaScript("location.hash='';location.reload()")
        _ = try await loadedLesson()
    }

    @MainActor
    func testSentenceLeavesRoomForHand() async throws {
        let web = try await loadedLesson(requireA: false)
        let window = try XCTUnwrap(web.window)
        let original = window.bounds
        defer { window.bounds = original; window.rootViewController?.view.frame = original }
        for size in [CGSize(width: 1194, height: 834), CGSize(width: 834, height: 1194), CGSize(width: 390, height: 780)] {
            window.bounds = CGRect(origin: .zero, size: size)
            window.rootViewController?.view.frame = window.bounds
            window.layoutIfNeeded()
            for _ in 0..<40 {
                let viewport = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
                if abs(viewport - size.width) < 1 { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            let report = try await web.callAsyncJavaScript("""
                build(variant,'Б');
                configure({size:52,leftInset:15,bold:100,tolerance:8},{persist:false});
                const afterLayout=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
                await afterLayout();
                const row=document.querySelector('#practice [data-lesson-stage="consolidation"]');
                window.scrollTo(0,row.getBoundingClientRect().top+scrollY-182);
                await afterLayout();
                const canvas=row.querySelector('canvas'),bounds=row.getBoundingClientRect(),field=canvas.getBoundingClientRect();
                const style=getComputedStyle(row),y=field.top+8;
                const hits=[field.left+3,(field.left+field.right)/2,field.right-3]
                    .every(x=>document.elementFromPoint(x,y)===canvas);
                const inMargin=document.elementFromPoint(bounds.right-5,y)?.closest('canvas');
                return {text:row.getAttribute('aria-label'),width:innerWidth,rowWidth:bounds.width,
                    left:field.left-bounds.left,right:bounds.right-field.right,reserve:parseFloat(style.paddingRight),
                    ruling:style.getPropertyValue('--row-ruling-lines').includes('linear-gradient'),
                    scale:Number(canvas.dataset.scale),hits,free:!inMargin,fits:document.body.scrollWidth<=innerWidth+1};
                """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
            let rowWidth = try XCTUnwrap(report?["rowWidth"] as? Double)
            let reserve = try XCTUnwrap(report?["reserve"] as? Double)
            let right = try XCTUnwrap(report?["right"] as? Double)
            XCTAssertEqual(report?["text"] as? String, "У Бориса барабан. Борис бил в барабан. Мы пели.")
            XCTAssertEqual(report?["width"] as? Double ?? 0, size.width, accuracy: 1)
            XCTAssertEqual(report?["left"] as? Double ?? 0, rowWidth * 0.15, accuracy: 1)
            XCTAssertEqual(reserve, min(rowWidth * 0.1, 110), accuracy: 1)
            XCTAssertGreaterThanOrEqual(right, reserve - 1)
            XCTAssertEqual(report?["scale"] as? Double, 0.52)
            for key in ["ruling", "hits", "free", "fits"] {
                XCTAssertEqual(report?[key] as? Bool, true, key + " at width \(size.width)")
            }
            if size.width > size.height {
                let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
                attachment.name = "sentence-room-for-hand"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
    }

    @MainActor
    func testLessonOptionsAndLiveDemo() async throws {
        let web = try await loadedLesson(requireA: false)
        let window = try XCTUnwrap(web.window)
        let original = window.bounds
        defer { window.bounds = original; window.rootViewController?.view.frame = original }
        for size in [CGSize(width: 1194, height: 834), CGSize(width: 834, height: 1194), CGSize(width: 390, height: 780)] {
            window.bounds = CGRect(origin: .zero, size: size)
            window.rootViewController?.view.frame = window.bounds
            window.layoutIfNeeded()
            for _ in 0..<40 {
                let width = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
                if abs(width - size.width) < 1 { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            let report = try await web.callAsyncJavaScript("""
                const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
                const issues=[];
                const check=(passed,label)=>{if(!passed)issues.push(label)};
                const $=id=>document.querySelector('#'+id);
                const option=(key,enabled)=>NativeApp.command('option',{key,enabled});
                await NativeApp.command('select',{letter:'А'});
                for(const key of ['schemes','additional','independent'])await option(key,false);
                check(!$('additional-practice')&&$('try-independent').hidden,'optional work is hidden');
                check(getComputedStyle($('hero-scheme-upper').parentElement).display==='none','schemes are hidden');
                document.body.classList.remove('native-ipad');
                $('open-parent').click();
                const labels=['schemes','additional','independent'].map(key=>$('parent-show-'+key).parentElement);
                const boxes=labels.map(label=>label.getBoundingClientRect());
                for(const [index,rect] of boxes.entries()){
                    check(rect.width>=48&&rect.height>=48,'setting hit target');
                    if(index>0)check(rect.top-boxes[index-1].bottom>=8,'setting hit target gap');
                    for(const x of [rect.left+5,rect.left+rect.width/2,rect.right-5]){
                        check(labels[index].contains(document.elementFromPoint(x,rect.top+rect.height/2)),'setting hit test');
                    }
                }
                $('parent-panel').close();
                document.body.classList.add('native-ipad');
                for(const [level,tolerance,size] of [['easy',6,73],['standard',4,52],['precise',2,36]]){
                    await NativeApp.command('level',{level});
                    check(preferences.tolerance===tolerance&&preferences.size===size&&LearnerExperience.activeLevel()===level,level);
                }
                await NativeApp.command('level',{level:'ideal'});
                check(preferences.tolerance===2&&LearnerExperience.activeLevel()==='ideal','technical ±2');
                await NativeApp.command('level',{level:'standard'});
                await option('additional',true);
                await option('independent',true);
                check(!!$('additional-practice')&&!$('try-independent').hidden,'optional work returns');
                await option('additional',false);
                await option('independent',false);
                // A short sheet can fit entirely at tall sizes. Force enough scroll
                // room in this fixture to exercise the pinned header at every size.
                const sheet=document.querySelector('.sheet');
                sheet.style.minHeight=(innerHeight+620)+'px';
                for(const compact of [false,true]){
                    window.scrollTo({top:compact?340:0,behavior:'instant'});
                    await pause(100);
                    WorksheetDock.update(true);
                    check(WorksheetDock.compact===compact,
                        'compact position '+compact+' at scroll '+scrollY+' and pointer '+activePointer);
                    const canvas=[...document.querySelectorAll('#practice canvas')].find(field=>{
                        const rect=field.getBoundingClientRect();
                        return rect.top>=145&&rect.bottom<innerHeight;
                    });
                    if(!canvas){issues.push('no visible field');continue}

                    canvas.setPointerCapture=()=>{};
                    const box=canvas.getBoundingClientRect();
                    const send=(type,y)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:8,pointerType:'pen',
                        clientX:box.left+box.width*.5,clientY:box.top+box.height*y,bubbles:true,cancelable:true}));
                    send('pointerdown',.7);
                    send('pointermove',.5);
                    const svg=$(compact?'dock-demo-upper':'demo'),loupe=$(compact?'dock-loupe':'inline-loupe');
                    playDemo();
                    const movement=svg.querySelector('[data-line="0"]');
                    const initial=movement.getAttribute('stroke-dashoffset');
                    await pause(180);
                    const demo=svg.getBoundingClientRect(),copy=loupe.getBoundingClientRect();
                    check(!loupe.hidden&&copy.width>0,'visible copy '+compact);
                    check(demo.right<=copy.left+1&&demo.width>0,'demo and copy overlap '+compact);
                    check(initial!==movement.getAttribute('stroke-dashoffset'),'demo stopped during writing '+compact);
                    send('pointercancel',.5);
                    await option('schemes',true);
                    const scheme=$(compact?'dock-scheme-upper':'hero-scheme-upper').parentElement;
                    check(getComputedStyle(scheme).display!=='none'&&scheme.getBoundingClientRect().right<=loupe.getBoundingClientRect().left+1,'schemes and copy overlap');
                    await pause(65);
                    const fitted=WorksheetDock.windowBox;
                    check(!!fitted&&Math.abs(fitted.width*fitted.zoom*WorksheetDock.scale-loupe.getBoundingClientRect().width)<1,'copy did not refit when schemes appeared');
                    await option('schemes',false);
                    if(compact&&innerWidth>innerHeight){
                        send('pointerdown',.7);
                        send('pointermove',.42);
                        await pause(120);
                    }
                }
                sheet.style.minHeight='';
                return {issues,width:innerWidth};
                """, arguments: [:], in: nil, contentWorld: .page) as? [String: Any]
            XCTAssertEqual(report?["width"] as? Double ?? 0, size.width, accuracy: 1)
            XCTAssertEqual(report?["issues"] as? [String], [], "Viewport \(size.width)")
            if size.width > size.height {
                let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
                attachment.name = "demo-and-live-copy"
                attachment.lifetime = .keepAlways
                add(attachment)
                _ = try await web.evaluateJavaScript("cancelActiveStroke?.();undefined")
            }
        }
    }

    @MainActor
    func testSampleRespectsWritingSchemeSetting() async throws {
        let lesson = try await loadedLesson(requireA: false)
        let folder = try XCTUnwrap(lesson.url).deletingLastPathComponent()
        let sample = WKWebView(frame: lesson.frame)
        let host = try XCTUnwrap(lesson.superview)
        host.addSubview(sample)
        defer { sample.removeFromSuperview() }

        for enabled in [false, true, false] {
            _ = try await lesson.callAsyncJavaScript(
                "return await NativeApp.command('option',{key:'schemes',enabled:enabled});",
                arguments: ["enabled": enabled], in: nil, contentWorld: .page
            )
            sample.loadFileURL(folder.appendingPathComponent("sample.html"), allowingReadAccessTo: folder)
            for _ in 0..<50 {
                if !sample.isLoading,
                   (try? await sample.evaluateJavaScript("!!document.querySelector('#demo [data-line]')") as? Bool) == true { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            let report = try await sample.evaluateJavaScript("""
                ({
                    demo: !!document.querySelector('#demo [data-line]'),
                    scheme: getComputedStyle(document.querySelector('#instruction-upper')).display !== 'none'
                })
                """) as? [String: Bool]
            XCTAssertEqual(report?["demo"], true)
            XCTAssertEqual(report?["scheme"], enabled)
        }
    }

    @MainActor
    func testNativeLayoutSizes() async throws {
        let web = try await loadedLesson()
        let window = try XCTUnwrap(web.window)
        let original = window.bounds
        defer { window.bounds = original; window.rootViewController?.view.frame = original }
        let ink = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        // Windowed iPadOS rejects orientation requests; this is a component size test.
        for size in [CGSize(width: 1210, height: 834), CGSize(width: 834, height: 1210)] {
            window.bounds = CGRect(origin: .zero, size: size)
            window.rootViewController?.view.frame = window.bounds
            window.layoutIfNeeded()
            for _ in 0..<40 {
                let viewport = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
                if abs(web.bounds.width - size.width) < 1 && abs(viewport - size.width) < 1 { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            XCTAssertEqual(web.bounds.width, size.width, accuracy: 1)
            let afterInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
            XCTAssertEqual(afterInk, ink)
            let viewport = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
            XCTAssertEqual(viewport, size.width, accuracy: 1)
            let fits = try await web.evaluateJavaScript("document.body.scrollWidth <= innerWidth + 1") as? Bool
            XCTAssertEqual(fits, true)
            let picture = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
            let attachment = XCTAttachment(image: picture)
            attachment.name = size.width > size.height ? "native-wide-layout" : "native-tall-layout"
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }

    @MainActor
    func testWorksheetActionsAreInline() async throws {
        let web = try await loadedLesson(requireA: false)
        let issues = try await web.callAsyncJavaScript("""
            await NativeApp.command('option',{key:'independent',enabled:true});
            await NativeApp.command('select',{letter:'А'});
            const issues=[];
            const footer=document.querySelector('.session-footer');
            const independent=document.querySelector('#try-independent');
            const finish=document.querySelector('#finish-session');
            const next=document.querySelector('#next-letter');
            const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
            const check=(condition,label)=>{if(!condition)issues.push(label)};
            check(getComputedStyle(footer).position==='static','footer is not inline');
            check(footer.getBoundingClientRect().top>=document.querySelector('#practice').getBoundingClientRect().bottom,'footer overlaps the practice');
            check(document.querySelector('#reference').alt==='арбуз','wrong reference for А');
            for(const selector of ['#reference-word','#dock-word']){
                check(parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)>=18,selector);
            }
            check(independent.textContent==='Самостоятельная проба','independent action label');
            footer.scrollIntoView({block:'center'});
            await frame();
            for(const control of [independent,finish,next]){
                const r=control.getBoundingClientRect();
                check(r.width>=48&&r.height>=48,control.id+' touch target');
                for(const x of [r.left+6,r.left+r.width/2,r.right-6]){
                    check(control.contains(document.elementFromPoint(x,r.top+r.height/2)),control.id+' hit area');
                }
            }
            const neighboring=[...footer.querySelectorAll('button')].map(button=>button.getBoundingClientRect());
            for(let i=1;i<neighboring.length;i++){
                const a=neighboring[i-1],b=neighboring[i];
                check(b.left-a.right>=8||b.top-a.bottom>=8,'touch targets too close');
            }
            const ink=JSON.stringify(data);
            independent.click();
            await frame();
            check(independent.getAttribute('aria-expanded')==='true'&&!!document.querySelector('#independent-practice canvas'),'independent trial did not open');
            independent.click();
            await frame();
            check(independent.getAttribute('aria-expanded')==='false'&&!document.querySelector('#independent-practice'),'independent trial did not close');
            check(ink===JSON.stringify(data),'ink changed');
            footer.scrollIntoView({block:'center'});
            await frame();
            return issues;
            """, arguments: [:], in: nil, contentWorld: .page) as? [String]
        XCTAssertEqual(issues, [])
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "worksheet-inline-actions"
        attachment.lifetime = .keepAlways
        add(attachment)
        _ = try await web.evaluateJavaScript("window.scrollTo({top:0});true")
    }

    @MainActor
    func testCourseNavigationAndBackupData() async throws {
        let web = try await loadedLesson()
        let valid = try await web.evaluateJavaScript("""
            (() => {
                for (const letter of ['А', 'О']) {
                    build(0, letter);
                    data['gost-file-b90-upper-0'] = models.map(line => line.map(([x,y]) => [x/150,y/180]));
                    save(); refresh();
                    document.querySelector('#finish-session').click();
                    document.querySelector('#session-result').close();
                }
                const backup = LocalBackup.parse(LocalBackup.export(localStorage));
                const good = backup.fields >= 2 && ['А','О'].every(letter => LearnerExperience.store().sessions(letter).length > 0);
                build(0, 'А');
                document.querySelector('#choose-letter').click();
                const tiles = document.querySelectorAll('#lesson-grid button').length;
                document.querySelector('#lesson-picker').close();
                return good && tiles === 33 && typeof NativeApp?.command === 'function';
            })();
            """) as? Bool
        XCTAssertEqual(valid, true)
        try await assertDurableEntries(in: web)
    }

    @MainActor
    func testFullCourseResources() async throws {
        let web = try await loadedLesson()
        let failures = try await web.callAsyncJavaScript("""
            const original = preferences.practiceRepeats;
            configure({practiceRepeats: 6});
            const failures = [];
            for (const letter of LetterCurriculum.order) {
                build(0, letter);
                await document.querySelector('#reference').decode();
                document.querySelector('#open-sample').click();
                const rows = [...document.querySelectorAll('[data-lesson-stage]')]
                    .filter(row => /^(upper|lower)-(letter|elements)$/.test(row.dataset.lessonStage));
                if (!rows.length || !rows.every(row => row.querySelectorAll('canvas').length === 6) ||
                    !document.querySelector('#scheme-upper path') || !document.querySelector('#scheme-lower path') ||
                    !document.querySelector('#art-guide path')) failures.push(letter);
                document.querySelector('#sample-panel').close();
                await new Promise(requestAnimationFrame);
            }
            if (LetterCurriculum.order.length !== 33) failures.push('count');
            build(0, 'А');
            configure({practiceRepeats: original});
            return failures;
            """, arguments: [:], in: nil, contentWorld: .page) as? [String]
        XCTAssertEqual(failures, [])
    }

    @MainActor
    func testPracticeRepeatsPersist() async throws {
        let web = try await loadedLesson()
        let original = try await web.evaluateJavaScript("preferences.practiceRepeats") as? Int ?? 0
        let ink = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        let changed = try await web.evaluateJavaScript("""
            document.querySelector('#open-parent').click();
            document.querySelector('#open-developer').click();
            window.repeatCanary = true;
            (() => {
                const control = document.querySelector('#setting-practiceRepeats');
                control.value = '6';
                control.dispatchEvent(new Event('change', {bubbles: true}));
                document.querySelector('#close-developer').click();
                return [...document.querySelectorAll('[data-lesson-stage]')]
                    .filter(row => /^(upper|lower)-(letter|elements)$/.test(row.dataset.lessonStage))
                    .every(row => row.querySelectorAll('canvas').length === 6);
            })();
            """) as? Bool
        XCTAssertEqual(changed, true)
        web.reload()
        let reopened = try await loadedLesson()
        let saved = try await reopened.evaluateJavaScript("""
            typeof window.repeatCanary === 'undefined' && preferences.practiceRepeats === 6 &&
            document.querySelectorAll('[data-lesson-stage="upper-letter"] canvas').length === 6 &&
            document.querySelectorAll('[data-lesson-stage="lower-letter"] canvas').length === 6;
            """) as? Bool
        XCTAssertEqual(saved, true)
        _ = try await reopened.callAsyncJavaScript("""
            await document.querySelector('#reference').decode();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return true;
            """, arguments: [:], in: nil, contentWorld: .page)
        let attachment = XCTAttachment(image: try await reopened.takeSnapshot(configuration: nil))
        attachment.name = "six-repeats"
        attachment.lifetime = .keepAlways
        add(attachment)
        _ = try await reopened.evaluateJavaScript("configure({practiceRepeats: \(original)})")
        let restored = try await reopened.evaluateJavaScript("JSON.stringify(data)") as? String
        XCTAssertEqual(restored, ink)
        let count = try await reopened.evaluateJavaScript("""
            document.querySelectorAll('[data-lesson-stage="upper-letter"] canvas').length;
            """) as? Int
        XCTAssertEqual(count, original == 0 ? 3 : original)
    }

    @MainActor
    func testWriteResetAndSave() async throws {
        let web = try await loadedLesson()
        let sampleOpened = try await web.evaluateJavaScript("""
            document.querySelector('#open-sample').click();
            !!document.querySelector('dialog[open] svg');
            """) as? Bool
        XCTAssertEqual(sampleOpened, true)

        let score = try await web.evaluateJavaScript("""
            document.querySelector('dialog[open]').close();
            (() => {
                const canvas = \(field);
                const cell = canvas.closest('.cell');
                const score = cell.querySelector('.score');
                const reset = cell.querySelector('.reset');
                if (!score.disabled) { score.click(); reset.click(); }
                canvas.scrollIntoView({block: 'center'});
                // Pointer capture is provided by the OS for real pointer streams.
                canvas.setPointerCapture = () => {};
                canvas.releasePointerCapture = () => {};
                const frame=JSON.parse(canvas.dataset.viewBox),rect=canvas.getBoundingClientRect();
                for (const line of demonstrationFor(models)) {
                    for (let i=0;i<line.length;i++) {
                        const [x,y]=line[i],event=i===0?'pointerdown':i===line.length-1?'pointerup':'pointermove';
                        canvas.dispatchEvent(new PointerEvent(event, {
                            bubbles:true,cancelable:true,pointerType:'pen',pointerId:1,isPrimary:true,
                            clientX:rect.left+(x-frame.x)/frame.width*rect.width,
                            clientY:rect.top+(y-frame.y)/frame.height*rect.height
                        }));
                    }
                }
                return Number.parseInt(score.textContent, 10);
            })();
            """) as? Int
        XCTAssertGreaterThanOrEqual(score ?? 0, 90)
        let feedback = try await web.callAsyncJavaScript("""
            return await new Promise(resolve => {
                const expiry = setTimeout(() => resolve('timeout'), 2000);
                FeedbackJobs.request({
                    strokes: [[[0, 0], [0.1, 0.1]]], model: [[[45, 44], [45, 135]]]
                }, 'outside', markup => {
                    clearTimeout(expiry);
                    resolve(markup.includes('extra-ink') ? FeedbackJobs.engine : 'empty');
                });
            });
            """, arguments: [:], in: nil, contentWorld: .page) as? String
        XCTAssertTrue(feedback == "worker" || feedback == "cooperative")
        print("Offline correction engine: \(feedback ?? "missing")")

        let resetAndUndo = try await web.evaluateJavaScript("""
            (() => {
                const cell = \(field).closest('.cell');
                const score = cell.querySelector('.score');
                const reset = cell.querySelector('.reset');
                score.click();
                const resetShown = !reset.hidden;
                reset.click();
                const cleared = score.disabled;
                document.querySelector('#undo').click();
                return resetShown && cleared && !score.disabled;
            })();
            """) as? Bool
        XCTAssertEqual(resetAndUndo, true)
        try await assertSavedScore(in: web)
    }

    @MainActor
    func testWrittenAttemptAfterLaunch() async throws {
        let web = try await loadedLesson()
        try await assertSavedScore(in: web)
    }

    @MainActor
    private func assertSavedScore(in web: WKWebView) async throws {
        let score = try await web.evaluateJavaScript("""
            Number.parseInt(\(field).closest('.cell').querySelector('.score').textContent, 10);
            """) as? Int
        XCTAssertGreaterThanOrEqual(score ?? 0, 90)
    }

    @MainActor
    private func assertDurableEntries(in web: WKWebView) async throws {
        let json = try await web.evaluateJavaScript("JSON.stringify(JSON.parse(LocalBackup.export(localStorage)).entries)") as! String
        let expected = try JSONSerialization.jsonObject(with: Data(json.utf8)) as! [String: String]
        let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("WebKit")
        for _ in 0..<100 {
            if let files = FileManager.default.enumerator(at: library, includingPropertiesForKeys: nil) {
                for case let file as URL in files where file.lastPathComponent == "localstorage.sqlite3" {
                    var database: OpaquePointer?
                    guard sqlite3_open_v2(file.path, &database, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
                        sqlite3_close(database)
                        continue
                    }
                    var statement: OpaquePointer?
                    var stored: [String: String] = [:]
                    if sqlite3_prepare_v2(database, "SELECT key,value FROM ItemTable", -1, &statement, nil) == SQLITE_OK {
                        while sqlite3_step(statement) == SQLITE_ROW {
                            guard let key = sqlite3_column_text(statement, 0), let bytes = sqlite3_column_blob(statement, 1) else { continue }
                            let value = Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 1)))
                            stored[String(cString: key)] = String(data: value, encoding: .utf16LittleEndian)
                        }
                    }
                    sqlite3_finalize(statement)
                    sqlite3_close(database)
                    if !expected.isEmpty && expected.allSatisfy({ stored[$0.key] == $0.value }) { return }
                }
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTFail("WebKit did not flush the backup entries to durable local storage before test handoff")
    }

    @MainActor
    private func loadedLesson(requireA: Bool = true) async throws -> WKWebView {
        let readyField = requireA ? field : "document.querySelector('canvas[data-surface-id]')"
        for _ in 0..<80 {
            let windows = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap(\.windows)
            for window in windows {
                guard let web = webView(in: window),
                      web.url?.isFileURL == true, !web.isLoading,
                      let ready = try? await web.evaluateJavaScript("""
                        !!\(readyField) && document.querySelector('#demo').innerHTML.length > 0
                        """) as? Bool, ready else { continue }
                return web
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw CocoaError(.fileReadUnknown, userInfo: [NSLocalizedDescriptionKey: "The local app did not load the lesson"])
    }

    @MainActor
    private func webView(in view: UIView) -> WKWebView? {
        if let web = view as? WKWebView { return web }
        return view.subviews.lazy.compactMap { self.webView(in: $0) }.first
    }
}
