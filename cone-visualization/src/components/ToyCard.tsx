'use client'

import { deleteToy } from "../services/api";
import { Render } from "cone-editor";
import { Card, Dropdown, Label } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Toy } from "./ConeList";

interface ToyCardProps {
  toy: Toy;
  scaleFactor: number;
  updateLastChanged: () => void;
}

const ToyCard = ({ toy, scaleFactor, updateLastChanged }: ToyCardProps) => {

    const deleteToyAndUpdate = async (id: number) => {
      try {
        await deleteToy(id);
      } finally {
        updateLastChanged();
      }
    };

    const style = {
        borderWidth: 2,
        borderColor: "black",
        color: "lightblue",
    };

    return (
        <Card className="w-96 shadow-lg group">
            <Card.Header className="relative">
                <div className="h-[320px] w-full flex items-end bg-gradient-to-br from-red-50/40 to-teal-100/40">
                    <Render toy={toy} scaleFactor={scaleFactor} style={style} />
                </div>
                <div className="hidden group-hover:block absolute top-5 right-5 z-10">
                    <Dropdown>
                        <Dropdown.Trigger className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}>
                            ...
                        </Dropdown.Trigger>
                        <Dropdown.Popover>
                            <Dropdown.Menu onAction={(key) => { if (key === 'delete') deleteToyAndUpdate(toy.id); }}>
                                <Dropdown.Item id="delete" textValue="Delete" className="text-red-500">
                                    <Label>Delete</Label>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown>
                </div>
            </Card.Header>
            <Card.Content>
                <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-blue-gray-800">
                        {toy.brand} {toy.name}
                    </p>
                    <p className="font-medium text-blue-gray-800">
                        {toy.size}
                    </p>
                </div>
                <p className="flex items-center font-normal text-sm text-gray-500 opacity-75">
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024"><path fill="currentColor" d="M840 836H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zm0-724H184c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h656c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zM610.8 378c6 0 9.4-7 5.7-11.7L515.7 238.7a7.14 7.14 0 0 0-11.3 0L403.6 366.3a7.23 7.23 0 0 0 5.7 11.7H476v268h-62.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H548V378h62.8z" /></svg>
                    {Math.round(toy.height)} mm
                </p>
                <p className="flex items-center font-normal text-sm text-gray-500 opacity-75">
                    <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10Zm7-10l-3-3m3 3l-3 3m3-3H5m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {Math.round(toy.diameter)} mm
                </p>
            </Card.Content>
        </Card>
    );
};

export default ToyCard;
