
function convertToAMPM(militaryTime) {
    let [hours, minutes] = militaryTime.split(':').map(Number);
    let period = 'AM';

    if (hours >= 12) {
        period = 'PM';
        hours = hours > 12 ? hours - 12 : hours;
    }

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
    return formattedTime;
}

function getEndingTime(startTimes, numOfRows) {
    const times = startTimes.replace(/&nbsp;/g, ' ').replace(/[^0-9: -]/g, '').split('-');
    
    let [endHours, endMinutes] = times[1].trim().split(':').map(Number);
    endMinutes += 30 * (numOfRows - 1);

    while (endMinutes >= 60) {
        endHours++;
        endMinutes -= 60;
    }

    const formattedEndingTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    return `${convertToAMPM(times[0].trim())} - ${convertToAMPM(formattedEndingTime)}`;
}

function parseSchedule(term) {
    const courses = [];
    const now = new Date();
    let year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const tables = document.getElementsByClassName("timetable");
    const winter = new Set([1, 2, 3, 4]);
    const fall = new Set([9, 10, 11, 12]);

    let table;

    if (term === 'F') {
        if (winter.has(currentMonth)) {
            year--;
        }
        table = tables[0];
    } else {
        if (fall.has(currentMonth)) {
            year++;
        }
        table = tables[1];
    } 

    table = table.cloneNode(true);
    const rows = table.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const time = row.querySelector(".timetable_left .smallbodytext")?.textContent;

        if (!time) {
            continue;
        }

        const tds = row.getElementsByClassName("timetablecell");
        let count = -2
        for (let j = 0; j < tds.length; j++) {
            count += 1
            const td = tds[j];

            if (td.textContent.trim().length <= 1) {
                continue;
            }

            const rowspan = td.rowSpan;

            if (rowspan <= 1) {
                continue;
            }

            const content = td.textContent.trim();
            const timings = getEndingTime(time, rowspan);
            const courseData = extractCourseData(content, timings, rowspan, term, year, count);
            
            if (courseData) {
                courses.push(JSON.stringify(courseData));
            }
        }
    }    
    return courses;
}

function extractCourseData(textContent, time, rowspan, term, year, count) {
    const tagText = textContent.split(' ').filter(Boolean);

    if (tagText.length === 0) {
        return null;
    }

    const courseCodeName = tagText.slice(0, 4).join(' ');
    const sectionTerm = tagText.slice(4, 8).join(' ');
    const place = tagText.slice(8).join(' ');
    const timings = time.split('-');    

    return {
        'course': courseCodeName,
        'section': sectionTerm,
        'location': place,
        'start_time': timings[0].trim(),
        'end_time': timings[1].trim(),
        'year': year,
        'month_start': term === 'F' ? '09' : '01',
        'month_end': term === 'F' ? '12' : '04',
        'weekday': count
    };
}

function getResults() {
    const apiUrl = 'endpoint';
    let fall = parseSchedule('F');
    let winter = parseSchedule('W');
    fall = JSON.stringify(fall);
    winter = JSON.stringify(winter);
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        },
        body: JSON.stringify({
            fall,
            winter
        })
    };
    fetch(apiUrl, options)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        window.open(data.fall, '_blank');
        window.open(data.winter, '_blank');
    })
    .catch(error => {
        console.error('Error:', error);
    });
}   
getResults();
