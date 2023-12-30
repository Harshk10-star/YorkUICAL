import boto3
import json
from icalendar import Calendar, Event
import pytz
from datetime import  datetime, date
from dateutil.rrule import MO, TU, WE, TH, FR, SA, SU

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    print(event)
    weekdays = [MO, TU, WE, TH, FR, SA, SU]
    semesters = ['fall', 'winter']
    tz = pytz.timezone('America/Toronto')
    
    icals = []
    body = ''
    if isinstance(event["body"], str):
        body = json.loads(event["body"])
    else:
        body = event["body"]
    print(body)
    for semester in semesters:
        cal = Calendar()
        cal.add('prodid', '-//My course schedule//example.com//')
        cal.add('version', '2.0')
        courses = body.get(semester)

        for course in courses:
            event_period = Event()
            event_period.add('summary', course['course'])
            event_period.add('location', course['location'])

            start_time = datetime.strptime(course['start_time'], '%I:%M %p').time()
            end_time = datetime.strptime(course['end_time'], '%I:%M %p').time()

            dtstart = datetime.combine(datetime(course['year'], int(course['month_start']), 1), start_time)
            dtend = datetime.combine(datetime(course['year'], int(course['month_start']), 1), end_time)

            dtstart = tz.localize(dtstart)
            dtend = tz.localize(dtend)

            event_period.add('dtstart', dtstart)
            event_period.add('dtend', dtend)

            # Add a weekly recurrence rule
            until_date = datetime(course['year'], int(course['month_end']), 28)  # Last possible day in a month
            until_date = tz.localize(until_date)
            event_period.add('rrule', {'freq': 'weekly', 'until': until_date, 'byday': weekdays[course['weekday']]})

            # Add the event to the calendar
            cal.add_component(event_period)
    
        # Convert the iCalendar data to a string
        icals.append(cal.to_ical().decode('utf-8'))

    # Put the iCalendar data into the S3 bucket
    for i, ical in enumerate(icals):
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"ical_{semesters[i]}_{timestamp}.ics"
        s3.put_object(Body=ical, Bucket='ical-yorku-bucket', Key=filename)

    
    return {
        "statusCode": 200,
        "body": {
            "fall_ical": icals[0],
            "winter_ical": icals[1]
        }
    }